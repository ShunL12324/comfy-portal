import { syncWorkflows } from './sync-workflows';
import { listWorkflows, getAndConvertWorkflow, WorkflowExtensionUnavailableError } from '@/services/comfy-api';
import { useWorkflowStore } from '../stores/workflow-store';
import { useServersStore } from '@/features/server/stores/server-store';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('@/utils/uuid', () => {
  let next = 0;
  return { generateUUID: () => 'sync-' + ++next };
});
jest.mock('@/services/comfy-api', () => ({
  listWorkflows: jest.fn(),
  getAndConvertWorkflow: jest.fn(),
  WorkflowExtensionUnavailableError: class extends Error {},
}));
jest.mock('@/features/server/stores/server-store', () => ({ useServersStore: { getState: jest.fn() } }));
const list = jest.mocked(listWorkflows);
const convert = jest.mocked(getAndConvertWorkflow);
const store = () => useWorkflowStore.getState();
const file = { filename: 'Portrait.json', modified: 1, size: 100 };
const graph = (seed: number) => ({ '1': { class_type: 'KSampler', inputs: { seed } } });
beforeEach(() => {
  jest.clearAllMocks();
  jest
    .mocked(useServersStore.getState)
    .mockReturnValue({ servers: [{ id: 'a', host: 'host', port: 8188, useSSL: 'Never' }] } as any);
  useWorkflowStore.setState({ assets: [], bindings: [], workflow: [], hiddenServerWorkflows: {}, lastServerSync: {} });
  list.mockResolvedValue([file]);
  convert.mockResolvedValue(graph(42));
});

test('coalesces requests and preserves edits made during a conversion await', async () => {
  await syncWorkflows('a');
  list.mockResolvedValue([{ ...file, modified: 2 }]);
  let release!: (value: unknown) => void;
  convert.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        release = resolve;
      }),
  );
  const first = syncWorkflows('a');
  const second = syncWorkflows('a');
  expect(first).toBe(second);
  await Promise.resolve();
  await Promise.resolve();
  store().updateNodeInput(store().workflow[0].id, '1', 'seed', 7);
  release(graph(60));
  await first;
  expect(store().workflow[0].data['1'].inputs.seed).toBe(7);
  expect(store().workflow[0].serverSync?.incoming?.data['1'].inputs.seed).toBe(60);
});

test('failed discovery and missing extension keep cache without claiming source deletion', async () => {
  await syncWorkflows('a');
  list.mockRejectedValueOnce(new Error('network'));
  await expect(syncWorkflows('a')).rejects.toThrow('network');
  expect(store().workflow[0].serverSync?.sourceMissing).toBe(false);
  list.mockRejectedValueOnce(new WorkflowExtensionUnavailableError());
  await expect(syncWorkflows('a')).resolves.toEqual({ state: 'unsupported' });
  expect(store().workflow).toHaveLength(1);
});

test('a successful empty directory marks removed sources but conversion failure does not erase listed workflows', async () => {
  await syncWorkflows('a');
  list.mockResolvedValueOnce([{ ...file, modified: 2 }]);
  convert.mockRejectedValueOnce(new Error('convert failed'));
  await expect(syncWorkflows('a')).rejects.toThrow('Could not sync');
  expect(store().workflow[0].serverSync?.sourceMissing).toBe(false);
  expect(store().workflow[0].data['1'].inputs.seed).toBe(42);
  list.mockResolvedValueOnce([]);
  await syncWorkflows('a');
  expect(store().workflow[0].serverSync?.sourceMissing).toBe(true);
});

test('hiding during conversion prevents recreation, and disconnected servers ignore late data', async () => {
  await syncWorkflows('a');
  let release!: (value: unknown) => void;
  list.mockResolvedValue([{ ...file, modified: 2 }]);
  convert.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        release = resolve;
      }),
  );
  const pending = syncWorkflows('a');
  await Promise.resolve();
  await Promise.resolve();
  store().removeWorkflow(store().workflow[0].id);
  release(graph(60));
  await pending;
  expect(store().workflow).toHaveLength(0);
  store().restoreHiddenServerWorkflow('a', file.filename);
  convert.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        release = resolve;
      }),
  );
  const disconnected = syncWorkflows('a');
  await Promise.resolve();
  await Promise.resolve();
  jest.mocked(useServersStore.getState).mockReturnValue({ servers: [] } as any);
  release(graph(99));
  await disconnected;
  expect(store().workflow).toHaveLength(0);
});

test('unchanged revision is skipped even after an observed no-op server update', async () => {
  await syncWorkflows('a');
  store().updateNodeInput(store().workflow[0].id, '1', 'seed', 7);
  list.mockResolvedValue([{ ...file, modified: 2 }]);
  await syncWorkflows('a');
  await syncWorkflows('a');
  expect(convert).toHaveBeenCalledTimes(2);
  expect(store().workflow[0].data['1'].inputs.seed).toBe(7);
});
