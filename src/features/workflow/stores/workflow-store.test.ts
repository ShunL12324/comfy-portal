import AsyncStorage from '@react-native-async-storage/async-storage';
import { useWorkflowStore } from './workflow-store';
import type { Workflow } from '../types';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('@/utils/uuid', () => {
  let next = 0;
  return { generateUUID: () => 'asset-' + ++next };
});

const graph = (): Workflow => ({
  '1': { id: '1', class_type: 'KSampler', inputs: { seed: 42 }, _meta: undefined },
});
beforeEach(async () => {
  await useWorkflowStore.persist.rehydrate();
  useWorkflowStore.setState({ assets: [], bindings: [], workflow: [] });
});

test('removing a connection preserves its reusable workflow and independent imported copy', () => {
  const input = graph();
  const id = useWorkflowStore.getState().addWorkflow({
    serverId: 'a',
    name: 'Portrait',
    data: input,
    addMethod: 'server-sync',
    thumbnail: 'file:///workflow-thumbnails-v2/retained.png',
  });
  input['1'].inputs.seed = 999;
  const assetId = useWorkflowStore.getState().bindings[0].assetId;
  const copy = useWorkflowStore.getState().importAsset(assetId, 'b')!;
  useWorkflowStore.getState().updateNodeInput(copy, '1', 'seed', 7);
  expect(useWorkflowStore.getState().workflow.find((w) => w.id === id)?.data['1'].inputs.seed).toBe(42);
  useWorkflowStore.getState().detachServer('a');
  expect(useWorkflowStore.getState().workflow.map((w) => w.serverId)).toEqual(['b']);
  expect(useWorkflowStore.getState().assets.find((a) => a.id === assetId)?.thumbnail).toBe(
    'file:///workflow-thumbnails-v2/retained.png',
  );
  expect(useWorkflowStore.getState().workflow[0].data['1'].inputs.seed).toBe(7);
});

test('duplicate imports receive distinct names and survive a persistence round trip', async () => {
  const state = useWorkflowStore.getState();
  state.addWorkflow({ serverId: 'a', name: 'Portrait', data: graph(), addMethod: 'file' });
  const assetId = useWorkflowStore.getState().assets[0].id;
  state.importAsset(assetId, 'a');
  state.importAsset(assetId, 'a');
  state.updateUsage(useWorkflowStore.getState().bindings[0].id);
  const stored = await AsyncStorage.getItem('cp-workflows-v2');
  expect(stored).toBeTruthy();
  const saved = JSON.parse(stored!);
  expect(saved.state.workflow).toBeUndefined();
  expect(saved.state.assets).toHaveLength(3);
  useWorkflowStore.setState({ assets: [], bindings: [], workflow: [] });
  await AsyncStorage.setItem('cp-workflows-v2', stored!);
  await useWorkflowStore.persist.rehydrate();
  const records = useWorkflowStore.getState().workflow;
  expect(new Set(records.map((r) => r.name)).size).toBe(3);
  expect(records[0].createdAt).toBeInstanceOf(Date);
  expect(records[0].lastUsed).toBeInstanceOf(Date);
});

test('unchanged node initialization neither publishes state nor persists a workflow', () => {
  const id = useWorkflowStore
    .getState()
    .addWorkflow({ serverId: 'a', name: 'No-op', data: graph(), addMethod: 'file' });
  const before = useWorkflowStore.getState();
  const listener = jest.fn();
  const unsubscribe = useWorkflowStore.subscribe(listener);
  const writes = jest.mocked(AsyncStorage.setItem).mock.calls.length;
  before.updateNodeInput(id, '1', 'seed', 42);
  expect(useWorkflowStore.getState()).toBe(before);
  expect(listener).not.toHaveBeenCalled();
  expect(jest.mocked(AsyncStorage.setItem).mock.calls.length).toBe(writes);
  unsubscribe();
});

test('editing a node preserves other node references and owns the incoming value', () => {
  const data = graph();
  data['2'] = { id: '2', class_type: 'CLIPTextEncode', inputs: { text: 'sample' }, _meta: undefined };
  const id = useWorkflowStore.getState().addWorkflow({ serverId: 'a', name: 'Edit', data, addMethod: 'file' });
  const before = useWorkflowStore.getState().workflow[0].data;
  const incoming = ['2', 0];
  useWorkflowStore.getState().updateNodeInput(id, '1', 'model', incoming);
  const after = useWorkflowStore.getState().workflow[0].data;
  expect(after).not.toBe(before);
  expect(after['1']).not.toBe(before['1']);
  expect(after['2']).toBe(before['2']);
  expect(before['1'].inputs.model).toBeUndefined();
  incoming[0] = 'changed';
  expect(after['1'].inputs.model).toEqual(['2', 0]);
});
