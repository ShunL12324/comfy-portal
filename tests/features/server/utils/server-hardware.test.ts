import { checkServerStatus } from '@/features/server/utils/server-sync';
import type { Server } from '@/features/server/types';

const mockFetch = jest.fn();
jest.mock('@/services/network', () => ({
  buildServerUrl: async (_ssl: string, host: string, port: number, path: string) => `http://${host}:${port}${path}`,
  fetchWithAuth: (url: string, token: string | undefined, options?: RequestInit) => mockFetch(url, token, options),
}));
jest.mock('expo-file-system', () => ({}));
const server: Server = { id: 'gpu', name: 'Studio', host: 'studio', port: 8188, useSSL: 'Never', status: 'offline' };

beforeEach(() => mockFetch.mockReset());

test('keeps every reported device from the existing core status request', async () => {
  mockFetch.mockImplementation(async (url: string) => ({
    ok: true,
    json: async () =>
      url.endsWith('/system_stats')
        ? { devices: [{ name: ' cuda:0 NVIDIA GeForce RTX 4060 : cudaMallocAsync ' }, { name: 'RTX 4090' }] }
        : [],
  }));
  expect(await checkServerStatus(server)).toMatchObject({
    status: 'online',
    gpuName: 'cuda:0 NVIDIA GeForce RTX 4060 : cudaMallocAsync',
    gpuNames: ['cuda:0 NVIDIA GeForce RTX 4060 : cudaMallocAsync', 'RTX 4090'],
  });
  expect(mockFetch.mock.calls.filter(([url]) => url.endsWith('/system_stats'))).toHaveLength(1);
});

test.each([
  {},
  { devices: [] },
  { devices: [{ name: 42 }] },
  { devices: [{ name: '  ' }] },
  { devices: [{ name: 'RTX 4090' }, null] },
])('missing or invalid hardware is still an online connection: %j', async (body) => {
  mockFetch.mockResolvedValue({ ok: true, json: async () => body });
  expect(await checkServerStatus(server)).toMatchObject({ status: 'online', gpuName: undefined, gpuNames: undefined });
});

test('a failed status request has no new hardware observation', async () => {
  mockFetch.mockResolvedValue({ ok: false });
  expect(await checkServerStatus(server)).toEqual({ status: 'offline' });
});
