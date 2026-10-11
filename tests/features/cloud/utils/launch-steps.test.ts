import type { LaunchRecord } from '@/features/cloud/stores/provisioning-store';
import {
  boxClockOffset,
  EARLY_POLL_MS,
  formatDuration,
  formatElapsed,
  fromSupervisorStep,
  hostWarning,
  HOST_STALL_MS,
  openingSteps,
  pollInterval,
  POLL_MS,
} from '@/features/cloud/utils/launch-steps';
import { accumulatePull, readStatusMessage } from '@/features/cloud/utils/pull-progress';
import type { SupervisorSnapshot } from '@/services/cloud-supervisor';
import manifest from '../fixtures/ghcr-manifest-sha-44dfa01.json';

const T0 = 1_791_699_344_000;

function launch(changes: Partial<LaunchRecord> = {}): LaunchRecord {
  return {
    id: 'vast:55348271',
    provider: 'vast',
    instanceId: '55348271',
    environmentId: 'env',
    environmentName: 'SDXL',
    environmentSnapshot: undefined as never,
    token: 'token',
    pricePerHour: 0.05,
    startedAt: T0 / 1000,
    stage: 'placing',
    marks: { orderedAt: T0 + 1_100 },
    machine: 'Machine 18023 · Poland, PL',
    ...changes,
  };
}

const states = (record: LaunchRecord) => openingSteps(record).map((step) => `${step.id}:${step.state}`);

describe('opening steps, stage by stage (timings from a real launch on machine 18023)', () => {
  test('order placed, no word from the host yet', () => {
    const steps = openingSteps(launch({ providerStatus: 'pending' }));
    expect(states(launch())).toEqual([
      'order:done',
      'host:running',
      'image:waiting',
      'container:waiting',
      'supervisor:waiting',
    ]);
    expect(steps[0]).toMatchObject({ detail: 'Instance 55348271', ms: 1_100 });
    expect(steps[1]).toMatchObject({
      detail: 'Waiting for Machine 18023 · Poland, PL to accept',
      startedAt: T0 + 1_100,
    });
  });

  test('the host pulling the image: a bar from real layers and bytes', () => {
    const status = 'ce2970b16a29: Pull complete';
    const record = launch({
      providerStatus: status,
      marks: { orderedAt: T0 + 1_100, hostAt: T0 + 10_300 },
      pull: accumulatePull(undefined, readStatusMessage(status)),
      imageLayers: manifest.layers,
    });
    expect(states(record)).toEqual([
      'order:done',
      'host:done',
      'image:running',
      'container:waiting',
      'supervisor:waiting',
    ]);
    const image = openingSteps(record)[2];
    expect(image).toMatchObject({ startedAt: T0 + 10_300, detail: '6 of 26 layers · 0.4 / 5.6 GB' });
    expect(image.ratio).toBeCloseTo(0.074, 3);
    expect(openingSteps(record)[1]).toMatchObject({ ms: 9_200, detail: 'Machine 18023 · Poland, PL' });
  });

  test('pulling, before any layer is named', () => {
    const status = 'sha-44dfa01: Pulling from shunl12324/comfy-portal-cloud-server';
    const image = openingSteps(
      launch({
        providerStatus: status,
        marks: { orderedAt: T0, hostAt: T0 + 10_000 },
        pull: accumulatePull(undefined, readStatusMessage(status)),
      }),
    )[2];
    expect(image).toMatchObject({ state: 'running', detail: '0 layers done', ratio: undefined });
  });

  test("vast's /ssh build: the image is in, the container is starting", () => {
    const status = '#6 2.980 Fetched 52.1 MB in 3s (18.7 MB/s)\n#6 2.980 Reading package lists...';
    const record = launch({
      providerStatus: status,
      marks: { orderedAt: T0, hostAt: T0 + 10_000, pulledAt: T0 + 165_700 },
      pull: accumulatePull(undefined, readStatusMessage(status)),
      imageLayers: manifest.layers,
    });
    expect(states(record)).toEqual([
      'order:done',
      'host:done',
      'image:done',
      'container:running',
      'supervisor:waiting',
    ]);
    const [, , image, container] = openingSteps(record);
    expect(image).toMatchObject({ ms: 155_700, ratio: 1, detail: '26 of 26 layers · 5.6 / 5.6 GB' });
    expect(container).toMatchObject({ startedAt: T0 + 165_700, detail: 'vast is adding its SSH layer to the image' });
  });

  test('booting: the container runs, the supervisor has not answered', () => {
    const record = launch({
      stage: 'booting',
      providerStatus: 'success, running ghcr.io/shunl12324/comfy-portal-cloud-server_sha-44dfa01/ssh',
      marks: { orderedAt: T0, hostAt: T0 + 10_000, pulledAt: T0 + 165_700, runningAt: T0 + 176_700 },
    });
    expect(states(record)).toEqual(['order:done', 'host:done', 'image:done', 'container:done', 'supervisor:running']);
    expect(openingSteps(record)[3].ms).toBe(11_000);
    expect(openingSteps(record)[4]).toMatchObject({
      startedAt: T0 + 176_700,
      detail: 'Waiting for it to answer over SSH',
    });
  });

  test("booting, with the supervisor's own line in the status", () => {
    const record = launch({
      stage: 'booting',
      providerStatus: 'CP phase=downloading steps=6/7 step=extension models=0/2 bytes=0/7516192768 rate=0 t=4',
      marks: { orderedAt: T0, runningAt: T0 + 176_700 },
    });
    expect(openingSteps(record)[4].detail).toBe('downloading · 6/7 steps · extension · 0.0 / 7.0 GB');
  });

  test('installing: all five done, with the durations that were measured', () => {
    const record = launch({
      stage: 'installing',
      snapshot: {} as SupervisorSnapshot,
      marks: {
        orderedAt: T0,
        hostAt: T0 + 10_000,
        pulledAt: T0 + 165_700,
        runningAt: T0 + 176_700,
        supervisorAt: T0 + 189_500,
      },
    });
    expect(openingSteps(record).every((step) => step.state === 'done')).toBe(true);
    expect(openingSteps(record)[4].ms).toBe(12_800);
  });

  test('first seen already running (the app was closed meanwhile): done, without made-up durations', () => {
    const record = launch({ stage: 'booting', marks: { orderedAt: T0, runningAt: T0 + 300_000 } });
    const [, host, image, container] = openingSteps(record);
    expect([host.state, image.state, container.state]).toEqual(['done', 'done', 'done']);
    expect(image.ms).toBeUndefined();
    expect(container.ms).toBeUndefined();
  });

  test('a terminal host fails the step it was on', () => {
    const record = launch({ stage: 'failed', marks: { orderedAt: T0, hostAt: T0 + 10_000 } });
    expect(states(record)).toEqual([
      'order:done',
      'host:done',
      'image:failed',
      'container:waiting',
      'supervisor:waiting',
    ]);
  });

  test('RunPod says nothing about its pull, and the screen says so', () => {
    const image = openingSteps(
      launch({ provider: 'runpod', providerStatus: 'running', marks: { orderedAt: T0, hostAt: T0 + 2_000 } }),
    )[2];
    expect(image).toMatchObject({ state: 'running', detail: 'RunPod does not report pull progress' });
  });
});

describe('supervisor steps', () => {
  const snapshot = {
    startedAt: 1_000_000,
    elapsed: 13,
    steps: [
      { id: 'link-directories', state: 'done', detail: '', ms: 33, startedAt: 1_000_000_100 },
      { id: 'extensions', state: 'done', detail: '', ms: 6_433, startedAt: 1_000_000_700 },
      {
        id: 'comfyui-start',
        state: 'running',
        detail: 'waiting for /system_stats',
        ms: null,
        startedAt: 1_000_010_000,
      },
    ],
  } as unknown as SupervisorSnapshot;

  test('steps that finished between two polls are shown done, with their duration', () => {
    const offset = boxClockOffset(snapshot, 1_000_013_000);
    expect(fromSupervisorStep(snapshot.steps[0], 'Prepare storage', offset)).toMatchObject({ state: 'done', ms: 33 });
    expect(fromSupervisorStep(snapshot.steps[1], 'Extensions', offset)).toMatchObject({ state: 'done', ms: 6_433 });
    expect(formatDuration(33)).toBe('<0.1 s');
    expect(formatDuration(6_433)).toBe('6.4 s');
  });

  test("the running step's timer starts when it did, on this device's clock", () => {
    // This device's clock is 5 s ahead of the box's.
    const offset = boxClockOffset(snapshot, 1_000_018_000);
    expect(offset).toBe(5_000);
    expect(fromSupervisorStep(snapshot.steps[2], 'Start ComfyUI', offset)).toMatchObject({
      state: 'running',
      startedAt: 1_000_015_000,
      detail: 'waiting for /system_stats',
    });
  });

  test('a step the supervisor has not started yet is pending', () => {
    expect(fromSupervisorStep(undefined, 'Check disk space', 0, 'disk-check')).toEqual({
      id: 'disk-check',
      label: 'Check disk space',
      state: 'waiting',
    });
  });

  test('an older supervisor without start times leaves the timer to the screen', () => {
    const step = fromSupervisorStep({ id: 'aria2', state: 'running', detail: '', ms: null }, 'Start downloader', 0);
    expect(step.startedAt).toBeUndefined();
  });
});

describe('polling cadence', () => {
  test('2 s while any launch waits on vast or on the supervisor, 4 s after', () => {
    expect(pollInterval([{ stage: 'placing' }])).toBe(EARLY_POLL_MS);
    expect(pollInterval([{ stage: 'booting' }])).toBe(EARLY_POLL_MS);
    expect(pollInterval([{ stage: 'installing' }, { stage: 'booting' }])).toBe(EARLY_POLL_MS);
    expect(pollInterval([{ stage: 'installing' }])).toBe(POLL_MS);
    expect(pollInterval([])).toBe(POLL_MS);
    expect([EARLY_POLL_MS, POLL_MS]).toEqual([2_000, 4_000]);
  });
});

describe('a host that stops talking', () => {
  test('is called out after five unchanged minutes, not before', () => {
    const record = launch({ providerStatus: 'ab04618ee625: Pull complete', marks: { statusChangedAt: T0 } });
    expect(hostWarning(record, T0 + HOST_STALL_MS - 1)).toBeUndefined();
    expect(hostWarning(record, T0 + HOST_STALL_MS)).toBe(
      'No progress from the host for 5 min. It may be stuck: destroy it and try another offer.',
    );
  });

  test('a docker error that never clears is named', () => {
    const record = launch({
      providerStatus: 'Error response from daemon: could not select device driver "" with capabilities: [[gpu]]',
      marks: { statusChangedAt: T0 },
    });
    expect(hostWarning(record, T0 + 6 * 60_000)).toMatch(
      /^The host has reported a Docker error for 6 min: Error response from daemon: could not select device driver/,
    );
  });

  test('only while the host is the one to answer', () => {
    const record = launch({ stage: 'booting', marks: { statusChangedAt: T0 } });
    expect(hostWarning(record, T0 + 60 * 60_000)).toBeUndefined();
  });
});

test('clock formats', () => {
  expect(formatElapsed(0)).toBe('0:00');
  expect(formatElapsed(7_900)).toBe('0:07');
  expect(formatElapsed(155_000)).toBe('2:35');
  expect(formatElapsed(3_723_000)).toBe('1:02:03');
  expect(formatDuration(41_200)).toBe('41 s');
  expect(formatDuration(125_000)).toBe('2:05');
});
