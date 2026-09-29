/**
 * Storage comes from our own extension, and its absence is ordinary.
 *
 * ComfyUI core cannot report disk capacity at all, so a server without the
 * Comfy Portal Endpoint route is the common case — it has to degrade to a plain
 * "unavailable" rather than throwing, because a throw here would take the
 * whole metrics panel down with it.
 */
import type { Server } from '@/features/server/types';
import { fetchServerMetrics, fetchServerStorage, shortGpuName } from '@/features/server/services/server-metrics';

const mockFetch = jest.fn();
jest.mock('@/services/network', () => ({
  buildServerUrl: async (_ssl: string, host: string, port: number, path: string) => `http://${host}:${port}${path}`,
  fetchWithAuth: (url: string, token: string | undefined, options?: RequestInit) => mockFetch(url, token, options),
}));

const server: Server = {
  id: 'server-1',
  name: 'Studio',
  host: '10.0.0.2',
  port: 8188,
  useSSL: 'Never',
  status: 'online',
};

const ok = (body: unknown) => ({ ok: true, json: async () => body });

beforeEach(() => mockFetch.mockReset());

test('storage reads the endpoint and keeps the reported numbers as given', async () => {
  mockFetch.mockResolvedValue(
    ok({
      status: 'success',
      storage: { path: '/home/shun/ComfyUI', total: 1_000_204_886_016, used: 812_345_678_901, free: 137_859_207_115 },
    }),
  );

  const storage = await fetchServerStorage(server);

  expect(mockFetch).toHaveBeenCalledWith('http://10.0.0.2:8188/cpe/system/storage', undefined, expect.anything());
  // Not recomputed from each other: POSIX reserved blocks make used + free fall
  // short of total, and deriving either would misreport it.
  expect(storage).toEqual({
    path: '/home/shun/ComfyUI',
    total: 1_000_204_886_016,
    used: 812_345_678_901,
    free: 137_859_207_115,
  });
});

test.each([
  ['the extension is not installed', { ok: false, status: 404, json: async () => ({}) }],
  ['the route answers with an error', { ok: true, json: async () => ({ status: 'error', message: 'boom' }) }],
  [
    'the body is not JSON',
    {
      ok: true,
      json: async () => {
        throw new SyntaxError('Unexpected token <');
      },
    },
  ],
  ['the payload has no usable total', { ok: true, json: async () => ({ status: 'success', storage: { free: 5 } }) }],
  ['total is zero', { ok: true, json: async () => ({ status: 'success', storage: { total: 0 } }) }],
])('storage degrades quietly when %s', async (_case, response) => {
  mockFetch.mockResolvedValue(response);
  await expect(fetchServerStorage(server)).resolves.toBeUndefined();
});

test('storage degrades quietly when the request itself fails', async () => {
  mockFetch.mockRejectedValue(new Error('Network request failed'));
  await expect(fetchServerStorage(server)).resolves.toBeUndefined();
});

test('a missing storage endpoint never disturbs the metrics request', async () => {
  // The two calls are independent; the one that works still answers.
  mockFetch.mockImplementation(async (url: string) => {
    if (url.endsWith('/cpe/system/storage')) return { ok: false, status: 404, json: async () => ({}) };
    return ok({
      devices: [{ name: 'cuda:0 NVIDIA GeForce RTX 4090', vram_total: 25_757_220_864, vram_free: 20_000_000_000 }],
    });
  });

  const [metrics, storage] = await Promise.all([fetchServerMetrics(server), fetchServerStorage(server)]);

  expect(storage).toBeUndefined();
  expect(metrics.gpuName).toBe('cuda:0 NVIDIA GeForce RTX 4090');
  expect(metrics.memoryTotal).toBe(25_757_220_864);
  expect(metrics.memoryUsed).toBe(5_757_220_864);
});

test.each([
  // Exactly what the WSL box reports.
  ['cuda:0 NVIDIA GeForce RTX 4060 : cudaMallocAsync', 'RTX 4060'],
  ['cuda:0 NVIDIA GeForce RTX 4090', 'RTX 4090'],
  ['cuda:1 NVIDIA A100-SXM4-80GB : native', 'A100-SXM4-80GB'],
  ['Apple M3 Max', 'Apple M3 Max'],
  [undefined, undefined],
])('the card shows the model, not the device index or allocator: %s', (raw, expected) => {
  expect(shortGpuName(raw)).toBe(expected);
});

test('metrics still reject when the server itself is unhappy, so the card can say so', async () => {
  mockFetch.mockResolvedValue({ ok: false, status: 500, json: async () => ({}) });
  await expect(fetchServerMetrics(server)).rejects.toThrow('Server metrics are unavailable.');
});

test('detail metrics expose all devices while VRAM numbers still refer to the primary device', async () => {
  mockFetch.mockResolvedValue(
    ok({
      devices: [
        { name: 'RTX 4090', vram_total: 24 * 1024 ** 3, vram_free: 16 * 1024 ** 3 },
        { name: 'RTX 4060', vram_total: 8 * 1024 ** 3, vram_free: 4 * 1024 ** 3 },
      ],
    }),
  );
  expect(await fetchServerMetrics(server)).toMatchObject({
    gpuName: 'RTX 4090',
    gpuNames: ['RTX 4090', 'RTX 4060'],
    memoryTotal: 24 * 1024 ** 3,
  });
});
