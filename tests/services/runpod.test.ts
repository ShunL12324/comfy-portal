import { createRunPodInstance, getRunPodInstance, searchRunPodOffers } from '@/services/runpod';

const originalFetch = global.fetch;
beforeEach(() => {
  global.fetch = jest.fn() as typeof fetch;
});
afterEach(() => {
  global.fetch = originalFetch;
});
function reply(data: unknown) {
  (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({ data }) });
}
test('only available single-GPU offers with a known price are selectable', async () => {
  const gpu = {
    id: 'gpu-a',
    displayName: 'Test GPU',
    memoryInGb: 24,
    lowestPrice: {
      uninterruptablePrice: 0.3,
      stockStatus: 'High',
      availableGpuCounts: [1, 2],
      minMemory: null,
      minVcpu: 4,
    },
  };
  reply({
    gpuTypes: [
      gpu,
      { ...gpu, id: 'unpriced', lowestPrice: null },
      { ...gpu, id: 'unavailable', lowestPrice: { ...gpu.lowestPrice, stockStatus: 'None' } },
      { ...gpu, id: 'multi-only', lowestPrice: { ...gpu.lowestPrice, availableGpuCounts: [4] } },
      { ...gpu, id: 'bad', memoryInGb: null },
    ],
  });
  expect(await searchRunPodOffers('test-key', 80)).toEqual([
    {
      id: 'gpu-a',
      gpuName: 'Test GPU',
      gpuRamGb: 24,
      pricePerHour: 0.3,
      stockStatus: 'High',
      memoryGb: undefined,
      vcpu: 4,
    },
  ]);
  const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
  expect(url).not.toContain('test-key');
  expect(init.headers.Authorization).toBe('Bearer test-key');
  expect(JSON.parse(init.body).variables.input).toMatchObject({ gpuCount: 1, secureCloud: true, minDisk: 80 });
});
test('an allocated pod can legitimately have no runtime or price yet', async () => {
  reply({ pod: { id: 'opaque-123', name: null, desiredStatus: 'CREATED', costPerHr: null, runtime: null } });
  expect(await getRunPodInstance('test-key', 'opaque-123')).toMatchObject({
    id: 'opaque-123',
    runtime: null,
    costPerHr: null,
  });
});
test('rental submission keeps storage, public ports and SSH identity explicit', async () => {
  reply({ podFindAndDeployOnDemand: { id: 'pod-abc', costPerHr: 0.4 } });
  await createRunPodInstance('test-key', {
    gpuTypeId: 'gpu-id',
    diskGb: 80,
    name: 'request-identity',
    image: 'test-runtime',
    env: { CP_TOKEN: 'test-supervisor-token' },
    publicKey: 'ssh-rsa TEST',
  });
  const input = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body).variables.input;
  expect(input).toMatchObject({
    gpuTypeId: 'gpu-id',
    gpuCount: 1,
    containerDiskInGb: 20,
    volumeInGb: 80,
    startSsh: true,
    ports: '22/tcp,8188/tcp,8189/tcp',
  });
  expect(input.env).toContainEqual({ key: 'CP_SSH_PUBLIC_KEY', value: 'ssh-rsa TEST' });
});
test('GraphQL errors are failures even when HTTP succeeds', async () => {
  (global.fetch as jest.Mock).mockResolvedValue({
    ok: true,
    json: async () => ({ errors: [{ message: 'Not authorized' }] }),
  });
  await expect(getRunPodInstance('test-key', 'pod')).rejects.toThrow('Not authorized');
});
