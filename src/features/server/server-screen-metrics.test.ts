/** Server-card observations retain independent polling, cancellation and sticky GPU identity. */
import { AppState } from 'react-native';
import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useServerObservations } from './hooks/use-server-observations';
import { useServersStore } from './stores/server-store';
import { fetchServerMetrics } from './services/server-metrics';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-router', () => ({
  useFocusEffect: (effect: any) => jest.requireActual('react').useEffect(effect, [effect]),
}));
jest.mock('@/features/server/services/server-metrics', () => ({ fetchServerMetrics: jest.fn() }));
jest.mock('@/features/server/utils/server-sync', () => ({
  checkServerStatus: jest.fn(),
  checkMultipleServers: jest.fn(),
  syncServerModels: jest.fn(),
}));
const fetchMetrics = jest.mocked(fetchServerMetrics);
const metrics = {
  gpuName: 'RTX 4090',
  gpuNames: ['RTX 4090', 'RTX 4060'],
  memoryTotal: 24 * 1024 ** 3,
  memoryUsed: 6 * 1024 ** 3,
  latencyMs: 17,
  observedAt: 1,
};
let renderer: ReactTestRenderer;
let listener: (state: any) => void;
let requests: { resolve: (value: any) => void; reject: (error: Error) => void; signal?: AbortSignal }[];
let next = 0;
function Harness() {
  useServerObservations();
  return null;
}
const store = () => useServersStore.getState();
async function render() {
  await act(async () => {
    renderer = create(createElement(Harness));
  });
}
beforeEach(async () => {
  jest.useFakeTimers();
  await AsyncStorage.clear();
  requests = [];
  Object.defineProperty(AppState, 'currentState', { value: 'active', configurable: true });
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, callback) => {
    listener = callback;
    return { remove: jest.fn() };
  });
  fetchMetrics.mockReset();
  fetchMetrics.mockImplementation(
    (_server, signal) =>
      new Promise((resolve, reject) => {
        requests.push({ resolve, reject, signal });
      }),
  );
  useServersStore.setState({
    servers: [
      {
        id: 'obs-' + ++next,
        name: 'Studio',
        host: 'studio',
        port: 8188,
        useSSL: 'Never',
        status: 'offline',
        gpuName: 'RTX 3060',
      },
    ],
    loading: false,
  });
});
afterEach(async () => {
  await act(async () => {
    renderer?.unmount();
    requests.forEach((request) => request.resolve(metrics));
  });
  jest.restoreAllMocks();
  jest.useRealTimers();
});

test('polls core metrics without catalogue or workflow dependencies and coalesces slow requests', async () => {
  await render();
  await act(async () => {
    jest.advanceTimersByTime(5_000);
  });
  expect(fetchMetrics).toHaveBeenCalledTimes(1);
  await act(async () => {
    requests[0].resolve(metrics);
  });
  expect(store().servers[0]).toMatchObject({ status: 'online', metrics, gpuNames: metrics.gpuNames });
  await act(async () => {
    jest.advanceTimersByTime(5_000);
  });
  expect(fetchMetrics).toHaveBeenCalledTimes(2);
});

test('offline readings clear live memory while retaining all cached GPUs; memory is never persisted', async () => {
  await render();
  await act(async () => {
    requests[0].resolve(metrics);
  });
  const saved = JSON.parse((await AsyncStorage.getItem('servers-storage'))!);
  expect(saved.state.servers[0].metrics).toBeUndefined();
  await act(async () => {
    jest.advanceTimersByTime(5_000);
  });
  await act(async () => {
    requests[1].reject(new Error('offline'));
  });
  expect(store().servers[0]).toMatchObject({ status: 'offline', gpuNames: metrics.gpuNames });
  expect(store().servers[0].metrics).toBeUndefined();
});

test('background and unmount cancel requests and prevent late updates; foreground resumes', async () => {
  await render();
  act(() => listener('background'));
  expect(requests[0].signal?.aborted).toBe(true);
  await act(async () => {
    requests[0].resolve(metrics);
    jest.advanceTimersByTime(15_000);
  });
  expect(store().servers[0].status).toBe('offline');
  expect(fetchMetrics).toHaveBeenCalledTimes(1);
  await act(async () => {
    listener('active');
  });
  expect(fetchMetrics).toHaveBeenCalledTimes(2);
  act(() => renderer.unmount());
  expect(requests[1].signal?.aborted).toBe(true);
  await act(async () => {
    requests[1].resolve(metrics);
  });
  expect(store().servers[0].metrics).toBeUndefined();
});

test('changing an endpoint starts a distinct observation and ignores the old response', async () => {
  await render();
  await act(async () => {
    store().updateServer(store().servers[0].id, { host: 'new-host' });
  });
  expect(fetchMetrics).toHaveBeenCalledTimes(2);
  await act(async () => {
    requests[0].resolve(metrics);
  });
  expect(store().servers[0].metrics).toBeUndefined();
  await act(async () => {
    requests[1].resolve({ ...metrics, gpuNames: ['RTX 5090'] });
  });
  expect(store().servers[0].gpuNames).toEqual(['RTX 5090']);
});
