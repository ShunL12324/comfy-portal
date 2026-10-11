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

export type SupervisorPhase = 'preparing' | 'downloading' | 'starting' | 'ready' | 'failed';

export type StepState = 'running' | 'done' | 'failed';

export interface SupervisorStep {
  id: string;
  state: StepState;
  detail: string;
  /** Wall time once the step settles; null while it runs. */
  ms: number | null;
  /** Unix ms on the box's clock. /v2 only. */
  startedAt?: number;
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
  /** Unix ms on the box's clock: when the download went active and finished. /v2 only. */
  startedAt?: number;
  finishedAt?: number;
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

/**
 * The supervisor's /v2/snapshot in the shape above (/v1/status's).
 *
 * The app asks for /v2 first because only it carries when each step and
 * download started, which the setup screen's timers need; /v1 stays the
 * fallback for images from before the Go supervisor. /v1 itself must not
 * change: released app builds parse it.
 */
export function normalizeSnapshot(raw: any): SupervisorSnapshot {
  if (!Array.isArray(raw?.services)) return raw as SupervisorSnapshot;
  const services: SupervisorSnapshot['services'] = {};
  for (const service of raw.services) {
    // v1 clients only knew comfyui and ollama.
    if (!service?.name || service.name === 'aria2') continue;
    const { name, ...rest } = service;
    delete rest.readyMs;
    services[name] = rest;
  }
  return {
    supervisorVersion: 3,
    phase: raw.phase,
    startedAt: raw.startedAt,
    elapsed: raw.elapsed,
    stalled: !!raw.stalled,
    lastProgressAt: raw.lastProgressAt,
    steps: (raw.steps ?? []).map((step: any) => ({
      id: step.id,
      state: step.state,
      detail: step.detail ?? '',
      ms: step.ms ?? null,
      startedAt: step.startedAt || undefined,
    })),
    models: (raw.models ?? []).map((model: any) => ({
      name: model.name,
      folder: model.folder,
      total: model.total ?? 0,
      completed: model.completed ?? 0,
      speed: model.speed ?? 0,
      state: model.state,
      error: model.error || null,
      errorCode: model.errorCode,
      hint: model.hint,
      startedAt: model.startedAt || undefined,
      finishedAt: model.finishedAt || undefined,
    })),
    totals: raw.totals,
    services,
    error: raw.error ?? null,
  };
}

/** `models[]` uses "<folder>/<name>" as its identity; retry takes the same. */
export function modelKey(model: SupervisorModel): string {
  return `${model.folder}/${model.name}`;
}
