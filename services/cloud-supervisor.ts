/**
 * Client for the supervisor running on a rented instance.
 *
 * The supervisor is a plain program on the box — see docker/supervisor — that
 * installs the template and then keeps ComfyUI alive. This is how the app asks
 * it what is happening. Before it existed the only signal during a 40-minute
 * install was vast tailing the container log, which is why the launch screen
 * could show one unchanging line while 47 GiB downloaded.
 */

/** Published alongside 8188 at creation time; ports can't be added later. */
export const SUPERVISOR_PORT = 8189;

export type SupervisorPhase =
  | 'preparing'
  | 'downloading'
  | 'starting'
  | 'ready'
  | 'failed';

export type StepState = 'running' | 'done' | 'failed';

export interface SupervisorStep {
  id: string;
  state: StepState;
  detail: string;
  /** Wall time once the step settles; null while it runs. */
  ms: number | null;
}

export interface SupervisorModel {
  name: string;
  folder: string;
  /** Bytes. 0 until the host reports a length. */
  total: number;
  completed: number;
  /** Bytes per second, 0 unless actively downloading. */
  speed: number;
  state: 'waiting' | 'active' | 'done' | 'error' | 'paused' | 'removed';
  error?: string | null;
  errorCode?: string;
  hint?: string;
}

export interface SupervisorSnapshot {
  supervisorVersion: number;
  phase: SupervisorPhase;
  startedAt: number;
  elapsed: number;
  /** No byte movement for a while. Worth surfacing rather than waiting it out. */
  stalled: boolean;
  lastProgressAt: number;
  steps: SupervisorStep[];
  models: SupervisorModel[];
  totals: {
    bytes: number;
    completed: number;
    speed: number;
    etaSeconds: number | null;
  };
  services: Record<
    string,
    {
      state: 'running' | 'starting' | 'restarting';
      pid?: number;
      restarts: number;
      lastExit?: number;
      answeredAt?: number;
      models?: string[];
    }
  >;
  error: { code: string; message: string; hint?: string } | null;
}

export class SupervisorError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'SupervisorError';
  }
}

export interface SupervisorTarget {
  host: string;
  port: number;
  token: string;
}

async function request<T>(
  target: SupervisorTarget,
  path: string,
  init?: { method?: string; body?: unknown; timeoutMs?: number },
): Promise<T> {
  const controller = new AbortController();
  // A rented box on the far side of the world, polled from a phone: a request
  // that hangs must not hold up the next poll.
  const timeout = setTimeout(() => controller.abort(), init?.timeoutMs ?? 10_000);

  try {
    const response = await fetch(`http://${target.host}:${target.port}${path}`, {
      method: init?.method ?? 'GET',
      headers: {
        Authorization: `Bearer ${target.token}`,
        Accept: 'application/json',
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: init?.body ? JSON.stringify(init.body) : undefined,
      signal: controller.signal,
    });

    if (response.status === 401) {
      throw new SupervisorError('The instance rejected the token.', 401);
    }
    if (!response.ok) {
      throw new SupervisorError(`Supervisor returned ${response.status}`, response.status);
    }
    const text = await response.text();
    return text ? (JSON.parse(text) as T) : ({} as T);
  } catch (error) {
    if (error instanceof SupervisorError) throw error;
    if (error instanceof Error && error.name === 'AbortError') {
      throw new SupervisorError('The instance did not answer in time.');
    }
    throw new SupervisorError(error instanceof Error ? error.message : 'Unreachable');
  } finally {
    clearTimeout(timeout);
  }
}

export function getStatus(target: SupervisorTarget) {
  return request<SupervisorSnapshot>(target, '/v1/status');
}

/**
 * Unauthenticated liveness. Answers as soon as vast publishes the port, which
 * is the moment the app can stop showing "waiting for the host" and start
 * showing what is actually going on.
 */
export async function isReachable(host: string, port: number): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5_000);
  try {
    const response = await fetch(`http://${host}:${port}/v1/health`, {
      signal: controller.signal,
    });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

/** Re-queue failed downloads. Omit `keys` to retry every failed model. */
export function retryModels(target: SupervisorTarget, keys?: string[]) {
  return request<{ retried: string[] }>(target, '/v1/models/retry', {
    method: 'POST',
    body: keys ? { keys } : {},
  });
}

export function restartComfyUI(target: SupervisorTarget) {
  return request<{ ok: boolean }>(target, '/v1/comfyui/restart', { method: 'POST' });
}

export async function getLog(
  target: SupervisorTarget,
  stream: 'supervisor' | 'comfyui' | 'ollama' = 'supervisor',
  tail = 200,
): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(
      `http://${target.host}:${target.port}/v1/log?stream=${stream}&tail=${tail}`,
      { headers: { Authorization: `Bearer ${target.token}` }, signal: controller.signal },
    );
    if (!response.ok) throw new SupervisorError(`Supervisor returned ${response.status}`);
    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

/** `models[]` uses "<folder>/<name>" as its identity; retry takes the same. */
export function modelKey(model: SupervisorModel): string {
  return `${model.folder}/${model.name}`;
}
