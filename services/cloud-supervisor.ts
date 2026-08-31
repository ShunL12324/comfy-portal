/**
 * Shapes the supervisor's API speaks in.
 *
 * The supervisor is a plain program on the box — see docker/supervisor — that
 * installs the template and then keeps ComfyUI alive. This is how the app asks
 * it what is happening. Before it existed the only signal during a 40-minute
 * install was vast tailing the container log, which is why the launch screen
 * could show one unchanging line while 47 GiB downloaded.
 *
 * The client that actually talks to it is services/ssh-supervisor.ts — direct
 * HTTP to a rented instance's published port turned out not to be reliable,
 * so every call goes over SSH exec instead. These types live here rather than
 * there because they describe the supervisor's API, not the transport.
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

/** `models[]` uses "<folder>/<name>" as its identity; retry takes the same. */
export function modelKey(model: SupervisorModel): string {
  return `${model.folder}/${model.name}`;
}
