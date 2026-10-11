import type { SupervisorSnapshot, SupervisorStep } from '@/services/cloud-supervisor';
import type { LaunchRecord } from '../stores/provisioning-store';
import { describePull, describeSupervisorLine, pullProgress, readStatusMessage } from './pull-progress';

/**
 * The setup screen's steps, derived from a launch record.
 *
 * Before the supervisor answers, five steps come from watching vast (see
 * LaunchMarks). After it answers, each step comes from the supervisor's own
 * step list, which carries durations, so a step that started and finished
 * between two polls still shows as done, with how long it took.
 */

export type StepState = 'waiting' | 'running' | 'done' | 'failed';

export interface SetupStep {
  id: string;
  label: string;
  state: StepState;
  /** Device-clock ms; drives the elapsed timer while running. */
  startedAt?: number;
  /** Wall time once done, when it was measured. */
  ms?: number;
  /** One live line of what is happening. */
  detail?: string;
  /** Real progress only: bytes or items, never time. */
  ratio?: number;
}

export const OPENING_STEP_IDS = ['order', 'host', 'image', 'container', 'supervisor'] as const;

/** Before the supervisor answers, poll often: each answer is a step. */
export const EARLY_POLL_MS = 2_000;
export const POLL_MS = 4_000;

export function pollInterval(launches: Pick<LaunchRecord, 'stage'>[]): number {
  return launches.some((launch) => launch.stage === 'placing' || launch.stage === 'booting') ? EARLY_POLL_MS : POLL_MS;
}

/** vast's status text has not changed for this long while the instance is not running yet. */
export const HOST_STALL_MS = 5 * 60_000;

/** A warning when the host has gone quiet, or keeps reporting a docker error. */
export function hostWarning(launch: LaunchRecord, now: number): string | undefined {
  if (launch.stage !== 'placing') return undefined;
  const since = launch.marks?.statusChangedAt;
  if (since === undefined || now - since < HOST_STALL_MS) return undefined;
  const minutes = Math.floor((now - since) / 60_000);
  const daemonError = readStatusMessage(launch.providerStatus ?? '').daemonError;
  return daemonError
    ? `The host has reported a Docker error for ${minutes} min: ${daemonError}. Destroy it and try another offer.`
    : `No progress from the host for ${minutes} min. It may be stuck: destroy it and try another offer.`;
}

const RUNNING_STAGES = new Set(['booting', 'installing', 'ready']);

/** Order placed → host → image → container → supervisor. */
export function openingSteps(launch: LaunchRecord): SetupStep[] {
  const marks = launch.marks ?? {};
  const failed = launch.stage === 'failed';
  const orderedAt = marks.orderedAt ?? launch.startedAt * 1000;
  // A later stage settles every step before it, even when the app was not
  // watching when it happened.
  const published = RUNNING_STAGES.has(launch.stage) || !!marks.runningAt;
  const answered = launch.stage === 'installing' || launch.stage === 'ready' || !!launch.snapshot;
  const hostAt = marks.hostAt ?? (published ? (marks.pulledAt ?? marks.runningAt) : undefined);
  const pulledAt = marks.pulledAt ?? (published ? marks.runningAt : undefined);
  const reading = readStatusMessage(launch.providerStatus ?? '');

  // A duration needs both ends seen at different polls; a step found already
  // over has none rather than a made-up zero.
  const span = (from?: number, to?: number) =>
    from !== undefined && to !== undefined && to > from ? to - from : undefined;
  // Exactly one step is current: the first not yet done.
  const steps: SetupStep[] = [
    {
      id: 'order',
      label: 'Order placed',
      state: 'done',
      ms: span(launch.startedAt * 1000, marks.orderedAt),
      detail: `Instance ${launch.instanceId}`,
    },
    {
      id: 'host',
      label: 'Host assigned',
      state: hostAt !== undefined || published ? 'done' : 'running',
      startedAt: orderedAt,
      ms: span(orderedAt, hostAt),
      detail:
        hostAt !== undefined || published
          ? launch.machine
          : launch.machine
            ? `Waiting for ${launch.machine} to accept`
            : 'Waiting for a host to accept',
    },
  ];

  const progress = pullProgress(launch.pull, launch.imageLayers);
  const pulled = pulledAt !== undefined || published;
  steps.push({
    id: 'image',
    label: 'Download runtime image',
    state: pulled ? 'done' : hostAt !== undefined ? 'running' : 'waiting',
    startedAt: hostAt,
    ms: span(hostAt, pulledAt),
    ratio: pulled ? 1 : progress.ratio,
    detail: pulled
      ? progress.layersTotal
        ? describePull({
            ...progress,
            layersDone: progress.layersTotal,
            layersUnpacked: progress.layersTotal,
            bytesDone: progress.bytesTotal,
          })
        : undefined
      : hostAt === undefined
        ? undefined
        : launch.pull?.started
          ? describePull(progress)
          : launch.provider === 'runpod'
            ? 'RunPod does not report pull progress'
            : 'Starting the download',
  });

  steps.push({
    id: 'container',
    label: 'Start container',
    state: published ? 'done' : pulled ? 'running' : 'waiting',
    startedAt: pulledAt,
    ms: span(pulledAt, marks.runningAt),
    detail: published
      ? undefined
      : pulled
        ? reading.building
          ? 'vast is adding its SSH layer to the image'
          : 'Creating the container'
        : undefined,
  });

  steps.push({
    id: 'supervisor',
    label: 'Start supervisor',
    state: answered ? 'done' : published ? 'running' : 'waiting',
    startedAt: marks.runningAt,
    ms: span(marks.runningAt, marks.supervisorAt),
    detail: answered
      ? undefined
      : published
        ? reading.supervisor
          ? describeSupervisorLine(reading.supervisor)
          : 'Waiting for it to answer over SSH'
        : undefined,
  });

  if (failed) {
    // The step that was current when it failed carries the failure.
    const current = steps.find((step) => step.state === 'running');
    if (current) current.state = 'failed';
  }
  return steps;
}

/**
 * Lines the box's clock up with this device's: the supervisor's `startedAt`
 * plus `elapsed` is its "now" when the snapshot was taken.
 */
export function boxClockOffset(snapshot: SupervisorSnapshot | undefined, snapshotAt: number | undefined): number {
  if (!snapshot || snapshotAt === undefined || !snapshot.startedAt) return 0;
  return snapshotAt - (snapshot.startedAt + snapshot.elapsed) * 1000;
}

/** A supervisor step as a setup step: its duration once done, its start (on our clock) while running. */
export function fromSupervisorStep(
  step: SupervisorStep | undefined,
  label: string,
  offset: number,
  id = step?.id ?? label,
): SetupStep {
  if (!step) return { id, label, state: 'waiting' };
  return {
    id,
    label,
    state: step.state,
    ms: step.ms ?? undefined,
    startedAt: step.startedAt ? step.startedAt + offset : undefined,
    detail: step.detail || undefined,
  };
}

/** `0:07`, `2:35`, `1:02:03`: a running clock. */
export function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = String(total % 60).padStart(2, '0');
  return hours ? `${hours}:${String(minutes).padStart(2, '0')}:${seconds}` : `${minutes}:${seconds}`;
}

/** `0.4 s`, `6.4 s`, `41 s`, `2:05`: how long a finished step took. */
export function formatDuration(ms: number): string {
  if (ms < 100) return '<0.1 s';
  if (ms < 10_000) return `${(ms / 1000).toFixed(1)} s`;
  if (ms < 60_000) return `${Math.round(ms / 1000)} s`;
  return formatElapsed(ms);
}
