/**
 * The crash path of a batched save: files that reached the pool, with their
 * journals, but whose index write never happened.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAssetWorkflow, mediaStorage, useMediaStore } from '@/features/gallery/stores/media-store';
import { resetWorkflowSnapshotsForTest } from '@/features/gallery/services/workflow-snapshots';
import { resetStorageMigrationsForTest, runStorageMigrations } from '@/services/storage-migration';

/** The fake disk: file uri → text content. */
const mockFiles = new Map<string, string>();

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-file-system', () => {
  const uriOf = (parent: string | { uri: string }, name?: string) =>
    typeof parent === 'string' ? parent : `${parent.uri.replace(/\/?$/, '/')}${name}`;
  class File {
    uri: string;
    constructor(parent: string | { uri: string }, name?: string) {
      this.uri = uriOf(parent, name);
    }
    get name() {
      return this.uri.split('/').pop()!;
    }
    get exists() {
      return mockFiles.has(this.uri);
    }
    creationTime = 1_790_000_000_000;
    modificationTime = 1_790_000_000_000;
    async text() {
      return mockFiles.get(this.uri)!;
    }
    create() {
      mockFiles.set(this.uri, '');
    }
    write(text: string) {
      mockFiles.set(this.uri, text);
    }
    delete() {
      mockFiles.delete(this.uri);
    }
  }
  class Directory {
    uri: string;
    constructor(parent: string | { uri: string }, name?: string) {
      this.uri = uriOf(parent, name).replace(/\/?$/, '/');
    }
    get exists() {
      return [...mockFiles.keys()].some((uri) => uri.startsWith(this.uri));
    }
    create() {}
    list() {
      return [...mockFiles.keys()]
        .filter((uri) => uri.startsWith(this.uri) && !uri.slice(this.uri.length).includes('/'))
        .map((uri) => new File(uri));
    }
  }
  return { File, Directory, Paths: { document: { uri: 'file:///docs/' }, cache: { uri: 'file:///cache/' } } };
});
jest.mock('@/services/storage-migration-stores', () => ({
  migrateWorkflows: jest.fn(async () => {}),
  migrateEnvironments: jest.fn(async () => {}),
}));
jest.mock('@/features/server/stores/server-store', () => ({ useServersStore: { getState: () => ({ servers: [] }) } }));
jest.mock('@/features/workflow/stores/workflow-store', () => ({
  useWorkflowStore: { getState: () => ({ assets: [], bindings: [] }) },
}));
let mockUuid = 0;
jest.mock('@/utils/uuid', () => ({ generateUUID: () => `adopted-${++mockUuid}` }));

const POOL = 'file:///docs/media-v2/';
const workflow = { '3': { class_type: 'KSampler', inputs: { seed: 7 } } };

beforeEach(async () => {
  mockFiles.clear();
  await AsyncStorage.clear();
  resetWorkflowSnapshotsForTest();
  resetStorageMigrationsForTest();
  await useMediaStore.persist.rehydrate();
  useMediaStore.setState({ assets: [] });
  await mediaStorage.flush();
});

test('a journaled file that never reached the index is adopted with its job identity', async () => {
  await AsyncStorage.setItem('cp-media-workflow:key-1', JSON.stringify(workflow));
  const journal = {
    timestamp: '2026-10-01T10:00:00.000Z',
    workflowKey: 'key-1',
    originalUrl: '["out.png","","output"]',
    sourceId: '["out.png","","output"]',
    promptId: 'prompt-1',
    producedBy: { serverId: 'server', workflowBindingId: 'binding' },
  };
  mockFiles.set(`${POOL}aaa.png`, 'bytes');
  mockFiles.set(`${POOL}aaa.png.json`, JSON.stringify(journal));

  await runStorageMigrations();

  const [asset] = useMediaStore.getState().assets;
  expect(asset).toMatchObject({ serverId: 'server', workflowId: 'binding', path: `${POOL}aaa.png` });
  expect(asset.metadata).toMatchObject({ promptId: 'prompt-1', sourceId: journal.sourceId, workflowKey: 'key-1' });
  expect(await getAssetWorkflow(asset)).toEqual(workflow);
  // The index is the record now; the journal is gone and so is nothing else.
  expect([...mockFiles.keys()]).toEqual([`${POOL}aaa.png`]);
  const persisted = JSON.parse((await AsyncStorage.getItem('cp-media-v2'))!);
  expect(persisted.state.assets.map((item: { path: string }) => item.path)).toEqual([`${POOL}aaa.png`]);
});

test('a journal left beside an indexed file is tidied without a second entry', async () => {
  useMediaStore.setState({
    assets: [
      {
        id: 'indexed',
        serverId: 'server',
        workflowId: 'binding',
        kind: 'image',
        path: `${POOL}bbb.png`,
        metadata: { timestamp: '2026-10-01T10:00:00.000Z', originalUrl: 'x', promptId: 'p' },
      },
    ],
  });
  mockFiles.set(`${POOL}bbb.png`, 'bytes');
  mockFiles.set(`${POOL}bbb.png.json`, JSON.stringify({ promptId: 'p' }));

  await runStorageMigrations();

  expect(useMediaStore.getState().assets.map((asset) => asset.id)).toEqual(['indexed']);
  expect(mockFiles.has(`${POOL}bbb.png.json`)).toBe(false);
  expect(mockFiles.has(`${POOL}bbb.png`)).toBe(true);
});

test('workflows adopted from legacy sidecars end up in snapshot storage', async () => {
  mockFiles.set(`${POOL}ccc.png`, 'bytes');
  mockFiles.set(`${POOL}ccc.png.json`, JSON.stringify({ timestamp: '2026-01-01T00:00:00.000Z', workflow }));

  await runStorageMigrations();

  const [asset] = useMediaStore.getState().assets;
  expect('workflow' in asset.metadata).toBe(false);
  expect(asset.metadata.workflowKey).toEqual(expect.any(String));
  expect(await getAssetWorkflow(asset)).toEqual(workflow);
});
