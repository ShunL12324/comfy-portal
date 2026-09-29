import AsyncStorage from '@react-native-async-storage/async-storage';
import { useWorkflowStore } from './workflow-store';
import { contentKey, hasLocalWorkflowChanges } from '../utils/workflow-source';
import type { ServerWorkflowSnapshot, Workflow } from '../types';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('@/utils/uuid', () => {
  let next = 0;
  return { generateUUID: () => 'source-' + ++next };
});
const graph = (seed: number): Workflow => ({
  '1': { id: '1', class_type: 'KSampler', inputs: { seed }, _meta: undefined },
});
const snapshot = (seed: number, modified = seed): ServerWorkflowSnapshot => ({
  name: 'Portrait',
  data: graph(seed),
  modified,
  size: 100,
});
const store = () => useWorkflowStore.getState();
const record = () => store().workflow.find((item) => item.addMethod === 'server-sync')!;
beforeEach(async () => {
  await AsyncStorage.clear();
  useWorkflowStore.setState({ assets: [], bindings: [], workflow: [], hiddenServerWorkflows: {}, lastServerSync: {} });
});

test('clean server workflows auto-update without changing their binding or usage', () => {
  store().receiveServerWorkflow('a', 'folder/Portrait.json', snapshot(42));
  const id = record().id;
  const assetId = store().bindings[0].assetId;
  store().updateUsage(id);
  const lastUsed = record().lastUsed;
  store().receiveServerWorkflow('a', 'folder/Portrait.json', snapshot(60));
  expect(record()).toMatchObject({ id, lastUsed });
  expect(record().data['1'].inputs.seed).toBe(60);
  expect(store().bindings[0].assetId).toBe(assetId);
  expect(record().serverSync?.incoming).toBeUndefined();
  expect(hasLocalWorkflowChanges(record())).toBe(false);
});

test('graph edits and renamed workflows survive repeated server updates and rollback', () => {
  store().receiveServerWorkflow('a', 'Portrait.json', snapshot(42));
  store().updateNodeInput(record().id, '1', 'seed', 7);
  store().updateWorkflow(record().id, { name: 'My portrait' });
  store().receiveServerWorkflow('a', 'Portrait.json', snapshot(60));
  store().receiveServerWorkflow('a', 'Portrait.json', snapshot(99));
  expect(record().name).toBe('My portrait');
  expect(record().data['1'].inputs.seed).toBe(7);
  expect(record().serverSync?.base?.data['1'].inputs.seed).toBe(42);
  expect(record().serverSync?.incoming?.data['1'].inputs.seed).toBe(99);
  store().receiveServerWorkflow('a', 'Portrait.json', snapshot(42, 100));
  expect(record().serverSync?.incoming).toBeUndefined();
  expect(record().data['1'].inputs.seed).toBe(7);
});

test('keep-copy-and-update commits an independent imported copy and retains the original media identity', () => {
  store().receiveServerWorkflow('a', 'Portrait.json', snapshot(42));
  const id = record().id;
  store().updateNodeInput(id, '1', 'seed', 7);
  store().receiveServerWorkflow('a', 'Portrait.json', snapshot(60));
  store().applyServerUpdate(id, true);
  const local = store().workflow.find((item) => item.addMethod === 'file')!;
  expect(local.data['1'].inputs.seed).toBe(7);
  expect(local.serverSync).toBeUndefined();
  expect(record().id).toBe(id);
  expect(record().data['1'].inputs.seed).toBe(60);
  store().updateNodeInput(local.id, '1', 'seed', 9);
  expect(record().data['1'].inputs.seed).toBe(60);
  expect(hasLocalWorkflowChanges(record())).toBe(false);
});

test('replace applies only the current incoming snapshot without creating a copy', () => {
  store().receiveServerWorkflow('a', 'Portrait.json', snapshot(42));
  const id = record().id;
  store().updateNodeInput(id, '1', 'seed', 7);
  store().receiveServerWorkflow('a', 'Portrait.json', snapshot(60));
  store().applyServerUpdate(id);
  expect(store().workflow).toHaveLength(1);
  expect(record().data['1'].inputs.seed).toBe(60);
  expect(record().serverSync?.incoming).toBeUndefined();
});

test('hide persists per server, blocks rediscovery, and restore makes it discoverable again', async () => {
  store().receiveServerWorkflow('a', 'Portrait.json', snapshot(42));
  store().removeWorkflow(record().id);
  const saved = await AsyncStorage.getItem('cp-workflows-v2');
  useWorkflowStore.setState({ hiddenServerWorkflows: {} });
  await AsyncStorage.setItem('cp-workflows-v2', saved!);
  await useWorkflowStore.persist.rehydrate();
  store().receiveServerWorkflow('a', 'Portrait.json', snapshot(60));
  expect(store().workflow).toHaveLength(0);
  store().receiveServerWorkflow('b', 'Portrait.json', snapshot(42));
  expect(store().workflow).toHaveLength(1);
  store().restoreHiddenServerWorkflow('a', 'Portrait.json');
  store().receiveServerWorkflow('a', 'Portrait.json', snapshot(60));
  expect(store().workflow).toHaveLength(2);
});

test('source removal keeps working data; keeping as imported retains binding identity and prevents reimport', () => {
  store().receiveServerWorkflow('a', 'Portrait.json', snapshot(42));
  const id = record().id;
  store().updateNodeInput(id, '1', 'seed', 7);
  store().reconcileServerWorkflows('a', [], '2026-09-28T00:00:00Z');
  expect(record().serverSync?.sourceMissing).toBe(true);
  expect(record().data['1'].inputs.seed).toBe(7);
  store().keepAsImported(id);
  store().receiveServerWorkflow('a', 'Portrait.json', snapshot(60));
  expect(store().workflow).toHaveLength(1);
  expect(store().workflow[0]).toMatchObject({ id, addMethod: 'file' });
  expect(store().workflow[0].serverSync).toBeUndefined();
});

test('legacy synced entries are protected on their first observation and persist the adopted baseline', async () => {
  const id = store().addWorkflow({
    serverId: 'a',
    name: 'Portrait',
    data: graph(7),
    addMethod: 'server-sync',
    metadata: { originalFilename: 'Portrait.json' },
  });
  store().receiveServerWorkflow('a', 'Portrait.json', snapshot(42));
  await useWorkflowStore.persist.rehydrate();
  expect(record().id).toBe(id);
  expect(record().data['1'].inputs.seed).toBe(7);
  expect(record().serverSync?.base?.data['1'].inputs.seed).toBe(42);
  expect(record().serverSync?.incoming?.data['1'].inputs.seed).toBe(42);
});

test('identical display names do not connect independent imported and server workflows', () => {
  const imported = store().addWorkflow({ serverId: 'a', name: 'Portrait', data: graph(7), addMethod: 'clipboard' });
  store().receiveServerWorkflow('a', 'Portrait.json', snapshot(42));
  expect(hasLocalWorkflowChanges(record())).toBe(false);
  store().updateNodeInput(record().id, '1', 'seed', 3);
  store().receiveServerWorkflow('a', 'Portrait.json', snapshot(42, 99));
  expect(record().serverSync?.incoming).toBeUndefined();
  expect(store().workflow.find((item) => item.id === imported)?.data['1'].inputs.seed).toBe(7);
});

test('object ordering does not mark content changed, while array order does', () => {
  expect(contentKey({ x: 1, inputs: { z: 2, a: 3 } })).toBe(contentKey({ inputs: { a: 3, z: 2 }, x: 1 }));
  expect(contentKey([1, 2])).not.toBe(contentKey([2, 1]));
});
