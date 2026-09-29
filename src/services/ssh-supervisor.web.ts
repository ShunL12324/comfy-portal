import { SupervisorError, type SupervisorSnapshot } from './cloud-supervisor';
import type { SshSupervisorTarget } from './ssh-supervisor';

/**
 * Web has no SSH — see ssh-keys.web.ts for why this file exists at all.
 *
 * `isReachable` answers false rather than throwing, because the poller calls
 * it on a timer and a rejection there would spam a browser console with
 * failures the user can do nothing about. Everything else throws, so a launch
 * screen reports the real reason instead of hanging.
 */
const UNSUPPORTED = 'SSH is not available in the browser — use the iOS or Android app to manage a cloud instance.';

export type { SshSupervisorTarget };

export function getStatus(_target: SshSupervisorTarget): Promise<SupervisorSnapshot> {
  return Promise.reject(new SupervisorError(UNSUPPORTED));
}

export async function isReachable(_target: SshSupervisorTarget): Promise<boolean> {
  return false;
}

export function retryModels(_target: SshSupervisorTarget, _keys?: string[]): Promise<{ retried: string[] }> {
  return Promise.reject(new SupervisorError(UNSUPPORTED));
}

export function restartComfyUI(_target: SshSupervisorTarget): Promise<{ ok: boolean }> {
  return Promise.reject(new SupervisorError(UNSUPPORTED));
}

export function getLog(
  _target: SshSupervisorTarget,
  _stream?: 'supervisor' | 'comfyui' | 'ollama',
  _tail?: number,
): Promise<string> {
  return Promise.reject(new SupervisorError(UNSUPPORTED));
}
