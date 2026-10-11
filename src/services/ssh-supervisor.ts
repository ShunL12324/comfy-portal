import SSHClient from '@dylankenneally/react-native-ssh-sftp';

import { normalizeSnapshot, SupervisorError, SUPERVISOR_PORT, type SupervisorSnapshot } from './cloud-supervisor';
import { ensureSshKeyPair } from './ssh-keys';

/**
 * Client for the supervisor, reached over SSH instead of direct HTTP.
 *
 * vast and RunPod both guarantee SSH; neither guarantees a rented instance's
 * other ports are reliably reachable from the open internet (confirmed the
 * hard way — a "running" instance whose HTTP ports TCP-accept and then return
 * nothing). SSH exec, running `curl` against the supervisor's own loopback
 * address from inside the box, sidesteps that entirely. See cloud-supervisor.ts
 * for what each call means; this mirrors its API so callers barely change.
 */

export interface SshSupervisorTarget {
  sshHost: string;
  sshPort: number;
  token: string;
}

/**
 * The underlying native SSH library (NMSSH) is not safe to use from
 * overlapping calls — a real spike run showed erratic hangs and failures that
 * traced back to concurrent, undisconnected sessions. Every exec goes through
 * this one-at-a-time queue so a manual retry tap can never overlap a poll.
 */
let queue: Promise<unknown> = Promise.resolve();
function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new SupervisorError(message)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

async function exec(target: SshSupervisorTarget, command: string, timeoutMs = 15_000): Promise<string> {
  return enqueue(async () => {
    const { privateKeyPem } = await ensureSshKeyPair();
    const client = await withTimeout(
      SSHClient.connectWithKey(target.sshHost, target.sshPort, 'root', privateKeyPem),
      timeoutMs,
      'Timed out connecting over SSH.',
    );
    try {
      return await withTimeout(client.execute(command), timeoutMs, 'Timed out running the command.');
    } catch (error) {
      throw new SupervisorError(error instanceof Error ? error.message : 'SSH command failed.');
    } finally {
      client.disconnect();
    }
  });
}

async function curlJson<T>(
  target: SshSupervisorTarget,
  path: string,
  init?: { method?: string; body?: unknown },
): Promise<T> {
  const bodyJson = init?.body ? JSON.stringify(init.body) : undefined;
  const command = [
    'curl -fsS -m 10',
    `-X ${init?.method ?? 'GET'}`,
    `-H ${shellQuote(`Authorization: Bearer ${target.token}`)}`,
    bodyJson ? `-H "Content-Type: application/json" -d ${shellQuote(bodyJson)}` : '',
    shellQuote(`http://127.0.0.1:${SUPERVISOR_PORT}${path}`),
  ]
    .filter(Boolean)
    .join(' ');

  const output = await exec(target, command);
  if (!output) throw new SupervisorError('Unreachable');
  try {
    return JSON.parse(output) as T;
  } catch {
    throw new SupervisorError('Supervisor returned an unexpected response.');
  }
}

/** One SSH round trip: /v2/snapshot, or /v1/status from a supervisor that predates it. */
export async function getStatus(target: SshSupervisorTarget): Promise<SupervisorSnapshot> {
  const auth = `-H ${shellQuote(`Authorization: Bearer ${target.token}`)}`;
  const url = (path: string) => shellQuote(`http://127.0.0.1:${SUPERVISOR_PORT}${path}`);
  const output = await exec(
    target,
    `curl -fsS -m 10 ${auth} ${url('/v2/snapshot')} 2>/dev/null || curl -fsS -m 10 ${auth} ${url('/v1/status')}`,
  );
  if (!output) throw new SupervisorError('Unreachable');
  try {
    return normalizeSnapshot(JSON.parse(output));
  } catch {
    throw new SupervisorError('Supervisor returned an unexpected response.');
  }
}

/** Whether the supervisor process itself is answering — not just SSH. Stays
 *  false for a while after SSH comes up, while the image is still pulling and
 *  the onstart script hasn't launched the supervisor yet. */
export async function isReachable(target: SshSupervisorTarget): Promise<boolean> {
  try {
    const code = await exec(
      target,
      `curl -s -m 5 -o /dev/null -w '%{http_code}' http://127.0.0.1:${SUPERVISOR_PORT}/v1/health`,
      12_000,
    );
    return code.trim() === '200';
  } catch {
    return false;
  }
}

/** Re-queue failed downloads. Omit `keys` to retry every failed model. */
export function retryModels(target: SshSupervisorTarget, keys?: string[]) {
  return curlJson<{ retried: string[] }>(target, '/v1/models/retry', {
    method: 'POST',
    body: keys ? { keys } : {},
  });
}

export function restartComfyUI(target: SshSupervisorTarget) {
  return curlJson<{ ok: boolean }>(target, '/v1/comfyui/restart', { method: 'POST' });
}

export function getLog(
  target: SshSupervisorTarget,
  stream: 'supervisor' | 'comfyui' | 'ollama' = 'supervisor',
  tail = 200,
): Promise<string> {
  const url = `http://127.0.0.1:${SUPERVISOR_PORT}/v1/log?stream=${stream}&tail=${tail}`;
  return exec(
    target,
    `curl -s -m 15 -H ${shellQuote(`Authorization: Bearer ${target.token}`)} ${shellQuote(url)}`,
    20_000,
  );
}
