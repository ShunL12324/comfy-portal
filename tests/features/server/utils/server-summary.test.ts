import { serverGpuSummary, serverHint, serverModels, serverStatus } from '@/features/server/utils/server-summary';

test('multi-device summaries group identical models and retain mixed models', () => {
  expect(
    serverGpuSummary([
      'cuda:0 NVIDIA GeForce RTX 4090 : cudaMallocAsync',
      'cuda:1 NVIDIA GeForce RTX 4090 : cudaMallocAsync',
      'cuda:2 NVIDIA GeForce RTX 4060 : cudaMallocAsync',
    ]),
  ).toBe('2 × RTX 4090 · RTX 4060');
  expect(serverGpuSummary(['cuda:0 NVIDIA GeForce RTX 4090'])).toBe('RTX 4090');
  expect(serverGpuSummary(undefined, 'cuda:0 NVIDIA GeForce RTX 4060')).toBe('RTX 4060');
  expect(serverGpuSummary()).toBeUndefined();
});

describe('serverStatus', () => {
  it('reports a ready server with its round trip', () => {
    expect(serverStatus('online', 32)).toEqual({ tone: 'ready', label: 'Ready · 32 ms' });
  });
  it('reports a ready server without a round trip yet', () => {
    expect(serverStatus('online')).toEqual({ tone: 'ready', label: 'Ready' });
  });
  it('breathes while checking and goes hollow when offline', () => {
    expect(serverStatus('refreshing', 32)).toEqual({ tone: 'busy', label: 'Checking connection' });
    expect(serverStatus('offline', 32)).toEqual({ tone: 'offline', label: 'Offline' });
  });
});

describe('serverModels', () => {
  it('has no count before the first sync', () => {
    expect(serverModels(undefined)).toBeUndefined();
  });
  it('counts what the last sync found, singular or plural', () => {
    const m = { name: 'a', type: 'checkpoints', hasPreview: false };
    expect(serverModels([])).toEqual({ count: 0, label: 'models', text: '0 models' });
    expect(serverModels([m])).toEqual({ count: 1, label: 'model', text: '1 model' });
    expect(serverModels([m, m])).toEqual({ count: 2, label: 'models', text: '2 models' });
  });
});

describe('serverHint', () => {
  it('joins only the facts that exist', () => {
    expect(serverHint({ label: 'Offline' })).toBe('Offline');
    expect(serverHint({ label: 'Ready · 32 ms' }, { text: '12 models' })).toBe('Ready · 32 ms, 12 models');
    expect(serverHint({ label: 'Ready' }, undefined, '3h 12m · Est. $1.20 · $0.40/hr')).toBe(
      'Ready, 3h 12m · Est. $1.20 · $0.40/hr',
    );
  });
});
