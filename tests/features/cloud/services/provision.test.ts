import { supportsRunPod } from '@/features/cloud/services/runtime';
import { useLaunchRequestStore, launchRequestStorage } from '@/features/cloud/stores/launch-request-store';
import { createRunPodInstance, listRunPodInstances } from '@/services/runpod';
import { useWorkflowStore } from '@/features/workflow/stores/workflow-store';
import { getStatus, isReachable } from '@/services/ssh-supervisor';
import { fetchImageLayers } from '@/services/image-manifest';
import manifest from '../fixtures/ghcr-manifest-sha-44dfa01.json';
import typical from '../fixtures/vast-timeline-typical.json';
import fast from '../fixtures/vast-timeline-fast.json';
import cached from '../fixtures/vast-timeline-cached.json';
import cachedFast from '../fixtures/vast-timeline-cached-fast.json';
import { createInstance, getInstance, listInstances } from '@/services/vast';
import { useProvisioningStore } from '@/features/cloud/stores/provisioning-store';
import type { Environment, HardwareSelection } from '@/features/cloud/types';
import { advanceLaunch, createLaunch, discardLaunchRequest } from '@/features/cloud/services/provision';

jest.mock('@/features/cloud/stores/provisioning-store', () => {
  const records: any[] = [];
  const store = {
    launches: records,
    start: jest.fn((record: any) => records.push(record)),
    get: (id: number) => records.find((r) => r.id === (String(id).includes(':') ? String(id) : 'vast:' + id)),
    update: jest.fn((id: number, changes: any) =>
      Object.assign(
        records.find((r) => r.id === (String(id).includes(':') ? String(id) : 'vast:' + id)),
        changes,
      ),
    ),
  };
  return {
    waitForProvisioning: jest.fn().mockResolvedValue(undefined),
    provisioningStorage: { flush: jest.fn().mockResolvedValue(undefined) },
    useProvisioningStore: { getState: () => store },
    launchKey: (r: any) => (r.provider ?? 'vast') + ':' + r.instanceId,
  };
});
jest.mock('@/features/workflow/stores/workflow-store', () => {
  const workflow: any[] = [];
  const store = { workflow, addWorkflow: jest.fn((record: any) => workflow.push(record)) };
  return { useWorkflowStore: { getState: () => store } };
});
jest.mock('@/features/server/stores/server-store', () => ({
  useServersStore: { getState: () => ({ addServer: () => 'server-1' }) },
}));
jest.mock('@/services/comfy-api', () => ({ saveWorkflowToServer: jest.fn().mockResolvedValue(undefined) }));
jest.mock('@/services/cloud-supervisor', () => ({ SUPERVISOR_PORT: 8189 }));
jest.mock('@/services/ssh-keys', () => ({
  ensureSshKeyPair: jest.fn().mockResolvedValue({ publicKeyOpenSsh: 'test-public-key' }),
  isSshKeyRegistered: jest.fn().mockResolvedValue(true),
  markSshKeyRegistered: jest.fn(),
}));
jest.mock('@/services/ssh-supervisor', () => ({
  isReachable: jest.fn().mockResolvedValue(true),
  getStatus: jest.fn(),
}));
jest.mock('@/features/cloud/services/runtime', () => ({
  supportsRunPod: jest.fn().mockReturnValue(true),
  imageFor: () => 'test-runtime',
}));
jest.mock('@/services/runpod', () => ({
  createRunPodInstance: jest.fn(),
  listRunPodInstances: jest.fn(),
  getRunPodInstance: jest.fn(),
}));
jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'SHA256' },
  digestStringAsync: jest.fn(async (_algorithm: string, input: string) => 'hash-' + input),
}));
jest.mock('@/features/cloud/stores/launch-request-store', () => {
  const store = {
    requests: [] as any[],
    put: (r: any) => {
      store.requests = [...store.requests.filter((item: any) => item.id !== r.id), r];
    },
    remove: (id: string) => {
      store.requests = store.requests.filter((r: any) => r.id !== id);
    },
  };
  return {
    useLaunchRequestStore: { getState: () => store },
    waitForLaunchRequests: jest.fn().mockResolvedValue(undefined),
    launchRequestStorage: { flush: jest.fn().mockResolvedValue(undefined) },
  };
});
jest.mock('@/services/vast', () => ({
  listInstances: jest.fn(),
  createInstance: jest.fn(),
  getInstance: jest.fn(),
  hasVastGivenUp: () => false,
  isTerminalStatus: () => false,
  ONSTART_LIMIT: 10000,
  registerSshKey: jest.fn(),
}));
jest.mock('@/utils/uuid', () => ({ generateUUID: () => 'test-token' }));
jest.mock('@/services/image-manifest', () => ({ fetchImageLayers: jest.fn() }));

const hardware = (diskGb = 80): HardwareSelection => ({
  provider: 'vast',
  offerId: '5',
  diskGb,
  gpuName: 'Test GPU',
  gpuCount: 1,
  memoryGb: 24,
  pricePerHour: 0.1,
  quotedAt: 1,
  priceScope: 'instance',
});
const credentials = { vastApiKey: 'test-only', runpodApiKey: '', civitaiApiKey: '', huggingFaceToken: '' };
const environment = (): Environment => ({
  id: 'recipe',
  name: 'Original',
  description: '',
  models: [],
  extensions: [],
  workflows: [{ name: 'Original workflow', data: {} }],
  createdAt: '',
  updatedAt: '',
});
beforeEach(() => {
  jest.clearAllMocks();
  useLaunchRequestStore.getState().requests.splice(0);
  (listInstances as jest.Mock).mockResolvedValue([]);
  useProvisioningStore.getState().launches.splice(0);
  useWorkflowStore.getState().workflow.splice(0);
  (createInstance as jest.Mock).mockResolvedValue(123);
  (getInstance as jest.Mock).mockResolvedValue({
    status: 'running',
    statusMessage: '',
    publicIp: '127.0.0.1',
    ports: { '8188': 8188 },
    sshHost: 'localhost',
    sshPort: 22,
  });
  (getStatus as jest.Mock).mockResolvedValue({ phase: 'ready' });
});
test('renting captures the recipe before async work and uses the reviewed disk', async () => {
  const draft = environment();
  const pending = createLaunch({ environment: draft, hardware: hardware(), credentials });
  draft.name = 'Edited while renting';
  draft.workflows[0].name = 'Changed';
  await pending;
  expect(createInstance).toHaveBeenCalledWith('test-only', expect.objectContaining({ diskGb: 80 }));
  expect(useProvisioningStore.getState().get(123)?.environmentSnapshot?.workflows[0].name).toBe('Original workflow');
});
test('installation resumes from the snapshot and imports workflows only once', async () => {
  await createLaunch({ environment: environment(), hardware: hardware(), credentials });
  await advanceLaunch(123, credentials);
  expect(useWorkflowStore.getState().workflow[0].name).toBe('Original workflow');
  expect(useProvisioningStore.getState().get(123)?.stage).toBe('ready');
  useProvisioningStore.getState().update(123, { stage: 'installing' });
  await advanceLaunch(123, credentials);
  expect(useWorkflowStore.getState().workflow).toHaveLength(1);
});
test('invalid disk and absent credentials fail before renting', async () => {
  await expect(createLaunch({ environment: environment(), hardware: hardware(NaN), credentials })).rejects.toThrow(
    'disk',
  );
  await expect(
    createLaunch({
      environment: environment(),
      hardware: hardware(),
      credentials: { ...credentials, vastApiKey: '' },
    }),
  ).rejects.toThrow('API key');
  expect(createInstance).not.toHaveBeenCalled();
});

test('concurrent confirmation shares a single rental', async () => {
  const options = { environment: environment(), hardware: hardware(), credentials };
  await Promise.all([createLaunch(options), createLaunch(options)]);
  expect(createInstance).toHaveBeenCalledTimes(1);
  expect(useProvisioningStore.getState().launches).toHaveLength(1);
});
test('concurrent recovery shares one server registration and import', async () => {
  await createLaunch({ environment: environment(), hardware: hardware(), credentials });
  await Promise.all([advanceLaunch(123, credentials), advanceLaunch(123, credentials)]);
  expect(useWorkflowStore.getState().workflow).toHaveLength(1);
});

test('reviewed hardware is snapshotted before asynchronous account setup', async () => {
  const quote = hardware();
  const pending = createLaunch({ environment: environment(), hardware: quote, credentials });
  quote.diskGb = 999;
  quote.gpuName = 'Different GPU';
  await pending;
  expect(useProvisioningStore.getState().get(123)?.hardware).toMatchObject({ diskGb: 80, gpuName: 'Test GPU' });
});

test('an uncertain response reconciles the labeled instance instead of renting again', async () => {
  (createInstance as jest.Mock).mockRejectedValueOnce(new Error('Connection lost'));
  const options = { environment: environment(), hardware: hardware(), credentials };
  await expect(createLaunch(options)).rejects.toThrow('Connection lost');
  const request = useLaunchRequestStore.getState().requests[0];
  expect(request.state).toBe('uncertain');
  expect(request).not.toHaveProperty('credentials');
  (listInstances as jest.Mock).mockResolvedValue([{ id: 456, label: request.label, pricePerHour: 0.1 }]);
  expect(await createLaunch(options)).toBe('vast:456');
  expect(createInstance).toHaveBeenCalledTimes(1);
  expect(useLaunchRequestStore.getState().requests).toHaveLength(0);
});
test('an unconfirmed order cannot silently turn into a second rental', async () => {
  (createInstance as jest.Mock).mockRejectedValueOnce(new Error('Timeout'));
  const options = { environment: environment(), hardware: hardware(), credentials };
  await expect(createLaunch(options)).rejects.toThrow('Timeout');
  await expect(createLaunch(options)).rejects.toThrow('No new order was sent');
  expect(createInstance).toHaveBeenCalledTimes(1);
});
test('failed intent persistence prevents a paid provider request', async () => {
  (launchRequestStorage.flush as jest.Mock).mockRejectedValueOnce(new Error('Disk full'));
  await expect(createLaunch({ environment: environment(), hardware: hardware(), credentials })).rejects.toThrow(
    'Disk full',
  );
  expect(createInstance).not.toHaveBeenCalled();
});
test('RunPod keeps opaque instance ids and provider billing scope', async () => {
  (createRunPodInstance as jest.Mock).mockResolvedValue({ id: 'abc123', costPerHr: 0.45 });
  const id = await createLaunch({
    environment: environment(),
    hardware: { ...hardware(), provider: 'runpod', offerId: 'NVIDIA Test GPU', priceScope: 'gpu-starting' },
    credentials: { ...credentials, runpodApiKey: 'runpod-test' },
  });
  expect(id).toBe('runpod:abc123');
  expect(useProvisioningStore.getState().get(id)).toMatchObject({
    provider: 'runpod',
    instanceId: 'abc123',
    pricePerHour: 0.45,
  });
  expect(createInstance).not.toHaveBeenCalled();
  expect(listRunPodInstances).not.toHaveBeenCalled();
});

test('an old runtime cannot start an unreachable RunPod rental', async () => {
  (supportsRunPod as jest.Mock).mockReturnValueOnce(false);
  await expect(
    createLaunch({
      environment: environment(),
      hardware: { ...hardware(), provider: 'runpod', offerId: 'GPU' },
      credentials: { ...credentials, runpodApiKey: 'runpod-test' },
    }),
  ).rejects.toThrow('updated runtime image');
  expect(createRunPodInstance).not.toHaveBeenCalled();
});
test('different simultaneous orders cannot bypass the creation lock', async () => {
  const first = createLaunch({ environment: environment(), hardware: hardware(), credentials });
  await expect(createLaunch({ environment: environment(), hardware: hardware(120), credentials })).rejects.toThrow(
    'already in progress',
  );
  await first;
  expect(createInstance).toHaveBeenCalledTimes(1);
});

function pendingOrder() {
  const request = {
    id: 'uncertain-order',
    accountHash: 'hash-test-only',
    label: 'comfy-portal:uncertain-order',
    environment: environment(),
    hardware: hardware(),
    token: 'test-token',
    requestedAt: 1,
    state: 'uncertain' as const,
  };
  useLaunchRequestStore.getState().put(request);
  return request;
}
test('clearing an order rejects a different credential without checking unrelated inventory', async () => {
  const request = pendingOrder();
  await expect(discardLaunchRequest(request.id, { ...credentials, vastApiKey: 'other-account' })).rejects.toThrow(
    'Restore',
  );
  expect(listInstances).not.toHaveBeenCalled();
  expect(useLaunchRequestStore.getState().requests).toHaveLength(1);
});
test('clearing an order retains a receipt recovered during the inventory request', async () => {
  const request = pendingOrder();
  (listInstances as jest.Mock).mockImplementationOnce(async () => {
    useLaunchRequestStore.getState().put({ ...request, receipt: { instanceId: '123' } });
    return [];
  });
  await expect(discardLaunchRequest(request.id, credentials)).rejects.toThrow('recovered');
  expect(useLaunchRequestStore.getState().requests[0].receipt?.instanceId).toBe('123');
});
test('clearing an order keeps recovery data when inventory is unavailable', async () => {
  const request = pendingOrder();
  (listInstances as jest.Mock).mockRejectedValueOnce(new Error('Offline'));
  await expect(discardLaunchRequest(request.id, credentials)).rejects.toThrow('Offline');
  expect(useLaunchRequestStore.getState().requests).toHaveLength(1);
});
test('clearing an absent order flushes its removal after checking inventory', async () => {
  const request = pendingOrder();
  await discardLaunchRequest(request.id, credentials);
  expect(listInstances).toHaveBeenCalledWith('test-only');
  expect(useLaunchRequestStore.getState().requests).toHaveLength(0);
  expect(launchRequestStorage.flush).toHaveBeenCalled();
});

test("each opening step is marked as vast's instance moves through it", async () => {
  (fetchImageLayers as jest.Mock).mockResolvedValue(manifest.layers);
  const clock = jest.spyOn(Date, 'now');
  let now = 1_000_000;
  clock.mockImplementation(() => now);
  await createLaunch({ environment: environment(), hardware: hardware(), credentials });
  const record = () => useProvisioningStore.getState().get(123)!;
  const poll = async (instance: object, at: number) => {
    now = at;
    (getInstance as jest.Mock).mockResolvedValueOnce({
      status: 'pending',
      statusMessage: '',
      publicIp: '91.150.160.38',
      ports: {},
      sshHost: 'ssh8.vast.ai',
      sshPort: 38462,
      machineId: 18023,
      geolocation: 'Poland, PL',
      image: 'ghcr.io/shunl12324/comfy-portal-cloud-server:sha-44dfa01',
      ...instance,
    });
    await advanceLaunch(123, credentials);
  };
  try {
    // Statuses from a real launch (tests/features/cloud/fixtures/vast-timeline-typical.json).
    await poll({}, 1_002_000);
    expect(record()).toMatchObject({ stage: 'placing', machine: 'Machine 18023 · Poland, PL' });
    expect(record().marks).toEqual({ orderedAt: 1_000_000, statusChangedAt: 1_002_000 });
    expect(fetchImageLayers).toHaveBeenCalledWith('ghcr.io/shunl12324/comfy-portal-cloud-server:sha-44dfa01');

    await poll(
      { status: 'loading', statusMessage: 'sha-44dfa01: Pulling from shunl12324/comfy-portal-cloud-server' },
      1_010_000,
    );
    expect(record().marks).toMatchObject({ hostAt: 1_010_000, statusChangedAt: 1_010_000 });
    expect(record().imageLayers).toHaveLength(26);

    await poll({ status: 'loading', statusMessage: 'ce2970b16a29: Pull complete' }, 1_040_000);
    await poll({ status: 'loading', statusMessage: 'ce2970b16a29: Pull complete' }, 1_042_000);
    expect(record().pull?.layers).toEqual({ ce2970b16a29: 'extracted' });
    expect(record().marks?.statusChangedAt).toBe(1_040_000);
    expect(record().marks?.pulledAt).toBeUndefined();

    await poll({ status: 'loading', statusMessage: '#6 2.980 Reading package lists...' }, 1_166_000);
    expect(record().marks?.pulledAt).toBe(1_166_000);
    expect(record().stage).toBe('placing');

    (isReachable as jest.Mock).mockResolvedValueOnce(false);
    const running = {
      status: 'running',
      statusMessage: 'success, running ghcr.io/shunl12324/comfy-portal-cloud-server_sha-44dfa01/ssh',
      ports: { '8188': 11771, '8189': 11765, '22': 11775 },
    };
    await poll(running, 1_177_000);
    expect(record()).toMatchObject({ stage: 'booting', marks: { runningAt: 1_177_000 } });
    expect(record().marks?.supervisorAt).toBeUndefined();

    (getStatus as jest.Mock).mockResolvedValueOnce({ phase: 'downloading', steps: [], models: [] });
    await poll(running, 1_181_000);
    expect(record()).toMatchObject({ stage: 'installing', snapshotAt: 1_181_000, marks: { supervisorAt: 1_181_000 } });
    expect(record().marks).toMatchObject({ orderedAt: 1_000_000, hostAt: 1_010_000, pulledAt: 1_166_000 });
  } finally {
    clock.mockRestore();
  }
});

type Timeline = { samples: { t: number; actualStatus: string | null; statusMsg: string; portsPublished: boolean }[] };

describe.each([
  ['typical host, nothing cached', typical],
  ['fast host, nothing cached', fast],
  ['host with most layers cached', cached],
  ['fast host with most layers cached', cachedFast],
])('replaying a recorded launch: %s', (_name, timeline: Timeline) => {
  test('the opening steps are marked in order, and never go back', async () => {
    (fetchImageLayers as jest.Mock).mockResolvedValue(manifest.layers);
    (isReachable as jest.Mock).mockResolvedValue(false);
    const clock = jest.spyOn(Date, 'now');
    let now = 0;
    clock.mockImplementation(() => now);
    try {
      await createLaunch({ environment: environment(), hardware: hardware(), credentials });
      const order = ['orderedAt', 'hostAt', 'pulledAt', 'runningAt'] as const;
      let reached = 1;
      for (const sample of timeline.samples) {
        now = sample.t;
        (getInstance as jest.Mock).mockResolvedValueOnce({
          status: sample.actualStatus ?? 'pending',
          statusMessage: sample.statusMsg.trim(),
          publicIp: '91.150.160.38',
          ports: sample.portsPublished ? { '8188': 11771, '8189': 11765, '22': 11775 } : {},
          sshHost: 'ssh8.vast.ai',
          sshPort: 38462,
          machineId: 18023,
        });
        await advanceLaunch(123, credentials);
        const marks = useProvisioningStore.getState().get(123)!.marks!;
        const count = order.filter((key) => marks[key] !== undefined).length;
        expect(count).toBeGreaterThanOrEqual(reached);
        expect(order.slice(0, count).every((key) => marks[key] !== undefined)).toBe(true);
        reached = count;
      }
      const { stage, marks } = useProvisioningStore.getState().get(123)!;
      expect(stage).toBe('booting');
      expect(marks!.hostAt!).toBeLessThanOrEqual(marks!.pulledAt!);
      expect(marks!.pulledAt!).toBeLessThanOrEqual(marks!.runningAt!);
    } finally {
      clock.mockRestore();
    }
  });
});
