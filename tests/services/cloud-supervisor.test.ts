import { normalizeSnapshot } from '@/services/cloud-supervisor';

// Abridged from a real /v2/snapshot (cpd, sha-44dfa01) mid-download.
const v2 = {
  version: 'sha-44dfa01',
  phase: 'downloading',
  startedAt: 1791699521,
  elapsed: 14,
  stalled: false,
  lastProgressAt: 1791699535,
  restartRequired: false,
  totals: { bytes: 7_150_000_000, completed: 2_100_000_000, speed: 105_000_000, etaSeconds: 48 },
  error: null,
  phases: [
    { phase: 'preparing', startedAt: 1791699521000, ms: 612 },
    { phase: 'downloading', startedAt: 1791699521612, ms: null },
  ],
  steps: [
    { id: 'link-directories', state: 'done', detail: '', ms: 33, startedAt: 1791699521010 },
    { id: 'extensions', state: 'running', detail: '', ms: null, startedAt: 1791699521700 },
  ],
  models: [
    {
      id: 'a1',
      name: 'sd_xl_base_1.0.safetensors',
      folder: 'checkpoints',
      total: 6_938_078_334,
      completed: 2_100_000_000,
      speed: 105_000_000,
      state: 'active',
      startedAt: 1791699531000,
    },
  ],
  services: [
    { name: 'aria2', state: 'running', pid: 41, restarts: 0 },
    { name: 'comfyui', state: 'starting', pid: 77, restarts: 0, readyMs: 21000 },
  ],
};

test('/v2/snapshot becomes the /v1 shape, keeping start times', () => {
  const snapshot = normalizeSnapshot(v2);
  expect(snapshot).toMatchObject({ phase: 'downloading', startedAt: 1791699521, elapsed: 14, error: null });
  expect(snapshot.steps[0]).toEqual({
    id: 'link-directories',
    state: 'done',
    detail: '',
    ms: 33,
    startedAt: 1791699521010,
  });
  expect(snapshot.steps[1]).toMatchObject({ ms: null, startedAt: 1791699521700 });
  expect(snapshot.models[0]).toMatchObject({ completed: 2_100_000_000, error: null, startedAt: 1791699531000 });
  // v1 never had aria2 among its services, and keyed them by name.
  expect(snapshot.services).toEqual({ comfyui: { state: 'starting', pid: 77, restarts: 0 } });
});

test('/v1/status passes through untouched', () => {
  const v1 = {
    supervisorVersion: 2,
    phase: 'ready',
    steps: [],
    models: [],
    services: { comfyui: { state: 'running' } },
  };
  expect(normalizeSnapshot(v1)).toBe(v1);
});
