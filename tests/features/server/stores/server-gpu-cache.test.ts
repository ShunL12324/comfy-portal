import AsyncStorage from '@react-native-async-storage/async-storage';
import { useServersStore } from '@/features/server/stores/server-store';
import { checkServerStatus, checkMultipleServers } from '@/features/server/utils/server-sync';
import type { Server } from '@/features/server/types';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('@/features/workflow/stores/workflow-store', () => ({ useWorkflowStore: {} }));
jest.mock('@/features/server/utils/server-sync', () => ({
  checkServerStatus: jest.fn(),
  checkMultipleServers: jest.fn(),
  syncServerModels: async () => [],
}));

const server: Server = { id: 'gpu', name: 'Studio', host: 'studio', port: 8188, useSSL: 'Never', status: 'offline' };
const check = jest.mocked(checkServerStatus);

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  useServersStore.setState({ servers: [{ ...server }], loading: false });
});

test('learns hardware once, keeps it while offline, and replaces it on reconnect', async () => {
  check.mockResolvedValue({ status: 'online', gpuName: 'RTX 4060' });
  await useServersStore.getState().refreshServer(server.id);
  expect(useServersStore.getState().servers[0].gpuName).toBe('RTX 4060');
  check.mockResolvedValue({ status: 'offline' });
  await useServersStore.getState().refreshServer(server.id);
  expect(useServersStore.getState().servers[0]).toMatchObject({ status: 'offline', gpuName: 'RTX 4060' });
  check.mockResolvedValue({ status: 'online', gpuName: 'RTX 4090' });
  await useServersStore.getState().refreshServer(server.id);
  expect(useServersStore.getState().servers[0].gpuName).toBe('RTX 4090');
});

test('missing hardware data keeps the cached name during single and batch refreshes', async () => {
  useServersStore.setState({ servers: [{ ...server, gpuName: 'RTX 4060' }] });
  check.mockResolvedValue({ status: 'online' });
  await useServersStore.getState().refreshServer(server.id);
  expect(useServersStore.getState().servers[0].gpuName).toBe('RTX 4060');
  jest.mocked(checkMultipleServers).mockResolvedValue([{ id: server.id, status: 'offline' }]);
  await useServersStore.getState().refreshServers();
  expect(useServersStore.getState().servers[0].gpuName).toBe('RTX 4060');
  jest.mocked(checkMultipleServers).mockResolvedValue([{ id: server.id, status: 'online', gpuName: 'RTX 5090' }]);
  await useServersStore.getState().refreshServers();
  expect(useServersStore.getState().servers[0].gpuName).toBe('RTX 5090');
});

test('persists the device across app restarts without persisting online status', async () => {
  check.mockResolvedValue({ status: 'online', gpuName: 'RTX 4060' });
  await useServersStore.getState().refreshServer(server.id);
  const saved = JSON.parse((await AsyncStorage.getItem('servers-storage'))!);
  expect(saved.state.servers[0].gpuName).toBe('RTX 4060');
  expect(saved.state.servers[0].status).toBeUndefined();
  await useServersStore.persist.rehydrate();
  expect(useServersStore.getState().servers[0]).toMatchObject({ status: 'offline', gpuName: 'RTX 4060' });
});

test('retains all GPUs across missing observations, offline checks and restarts, then replaces the whole snapshot', async () => {
  const gpuNames = ['RTX 4090', 'RTX 4090', 'RTX 4060'];
  check.mockResolvedValue({ status: 'online', gpuName: gpuNames[0], gpuNames });
  await useServersStore.getState().refreshServer(server.id);
  expect(useServersStore.getState().servers[0].gpuNames).toEqual(gpuNames);
  check.mockResolvedValue({ status: 'online' });
  await useServersStore.getState().refreshServer(server.id);
  check.mockResolvedValue({ status: 'offline' });
  await useServersStore.getState().refreshServer(server.id);
  await useServersStore.persist.rehydrate();
  expect(useServersStore.getState().servers[0]).toMatchObject({ status: 'offline', gpuNames });
  check.mockResolvedValue({ status: 'online', gpuName: 'RTX 5090', gpuNames: ['RTX 5090'] });
  await useServersStore.getState().refreshServer(server.id);
  expect(useServersStore.getState().servers[0].gpuNames).toEqual(['RTX 5090']);
});

test('legacy SSL settings migrate to Auto', () => {
  const { toAutoScheme } = jest.requireActual('@/features/server/stores/server-store') as typeof import('@/features/server/stores/server-store');
  expect(toAutoScheme({ ...server, useSSL: 'Never' }).useSSL).toBe('Auto');
  expect(toAutoScheme({ ...server, useSSL: 'Always' }).useSSL).toBe('Auto');
  const auto = { ...server, useSSL: 'Auto' as const };
  expect(toAutoScheme(auto)).toBe(auto);
});
