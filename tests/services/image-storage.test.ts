import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAssetWorkflow, useMediaStore, type MediaAsset } from '@/features/gallery/stores/media-store';
import {
  WORKFLOW_SNAPSHOT_PREFIX,
  resetWorkflowSnapshotsForTest,
} from '@/features/gallery/services/workflow-snapshots';
import {
  beginMediaSaveBatch,
  deleteGeneratedMedia,
  pruneMissingMedia,
  saveGeneratedMedia,
} from '@/services/image-storage';
import { stillFile } from '@/features/gallery/services/video-still-file';

/** Paths that exist on the fake mockDisk; `delete()` takes them off it. */
const mockDisk = new Set<string>();
/** Text written to files on the fake disk. */
const mockText = new Map<string, string>();
/** Bytes written by copies; a move writes none. */
const mockCopies: string[] = [];
/** Every file operation, in order, as `op:uri`. */
const mockOps: string[] = [];
/** Sources whose move fails. */
const mockFailingMoves = new Set<string>();
jest.mock('expo-file-system', () => {
  const Directory = jest.fn().mockImplementation((parent: { uri: string }, name: string) => ({
    uri: `${parent.uri}${name}/`,
    create: jest.fn(),
  }));
  const File = jest.fn().mockImplementation((pathOrDir: string | { uri: string }, name?: string) => {
    const file = {
      uri: typeof pathOrDir === 'string' ? pathOrDir : `${pathOrDir.uri}${name}`,
      get exists() {
        return mockDisk.has(file.uri);
      },
      create: () => mockDisk.add(file.uri),
      write: (text: string) => {
        mockOps.push(`write:${file.uri}`);
        mockDisk.add(file.uri);
        mockText.set(file.uri, text);
      },
      delete: () => {
        mockOps.push(`delete:${file.uri}`);
        mockDisk.delete(file.uri);
      },
      move: async (to: { uri: string }) => {
        if (mockFailingMoves.has(file.uri)) throw new Error('move failed');
        mockOps.push(`move:${to.uri}`);
        mockDisk.delete(file.uri);
        mockDisk.add(to.uri);
        file.uri = to.uri;
      },
      copy: async (to: { uri: string }) => {
        mockCopies.push(file.uri);
        mockDisk.add(to.uri);
      },
    };
    return file;
  });
  return { File, Directory, Paths: { cache: { uri: 'file:///cache/' }, document: { uri: 'file:///docs/' } } };
});
jest.mock('@/features/workflow/stores/workflow-store', () => ({ useWorkflowStore: {} }));
let mockUuid = 0;
jest.mock('@/utils/uuid', () => ({ generateUUID: () => `uuid-${++mockUuid}` }));
jest.mock('@/services/media-provenance', () => ({ resolveProvenance: () => ({}) }));

const asset = (id: string): MediaAsset => ({
  id,
  serverId: 'server',
  workflowId: 'workflow',
  kind: 'video',
  path: `file:///media-v2/${id}.mp4`,
  metadata: { timestamp: `2026-09-30T00:00:0${id.length}Z`, originalUrl: 'https://server/view' },
});

/** Index writes since the last reset, read back as the assets they persisted. */
const indexWrites = () => (AsyncStorage.setItem as jest.Mock).mock.calls.filter(([key]) => key === 'cp-media-v2');
const persistedAssets = async (): Promise<MediaAsset[]> =>
  JSON.parse((await AsyncStorage.getItem('cp-media-v2'))!).state.assets;

beforeEach(async () => {
  await useMediaStore.persist.rehydrate();
  mockDisk.clear();
  mockText.clear();
  mockOps.length = 0;
  useMediaStore.setState({ assets: [asset('a'), asset('bb'), asset('ccc')] });
  useMediaStore.getState().assets.forEach((item) => mockDisk.add(item.path));
});

test('deleting removes the file and its gallery entry', async () => {
  await deleteGeneratedMedia([asset('a').path, asset('bb').path]);
  expect(useMediaStore.getState().assets.map((item) => item.id)).toEqual(['ccc']);
  expect([...mockDisk]).toEqual([asset('ccc').path]);
});

test('an entry leaves the gallery even when its file is already gone', async () => {
  mockDisk.delete(asset('a').path);
  await deleteGeneratedMedia([asset('a').path]);
  expect(useMediaStore.getState().assets.map((item) => item.id)).not.toContain('a');
});

test('pruning drops only entries whose file is missing', async () => {
  mockDisk.delete(asset('bb').path);
  await pruneMissingMedia();
  expect(
    useMediaStore
      .getState()
      .assets.map((item) => item.id)
      .sort(),
  ).toEqual(['a', 'ccc']);
});

test('a batch leaves the gallery in one update, whatever its size', async () => {
  const updates = jest.fn();
  const unsubscribe = useMediaStore.subscribe(updates);
  // Each update re-renders the grid and rewrites the whole persisted index.
  await deleteGeneratedMedia([asset('a').path, asset('bb').path]);
  expect(updates).toHaveBeenCalledTimes(1);
  updates.mockClear();
  mockDisk.clear();
  await pruneMissingMedia();
  expect(updates).toHaveBeenCalledTimes(1);
  unsubscribe();
  expect(useMediaStore.getState().assets).toEqual([]);
});

test('deleting a video deletes its cached still, and only its own', async () => {
  const stillA = stillFile(asset('a').path).uri;
  const stillB = stillFile(asset('bb').path).uri;
  expect(stillA).not.toBe(stillB);
  mockDisk.add(stillA);
  mockDisk.add(stillB);
  await deleteGeneratedMedia([asset('a').path]);
  expect(mockDisk.has(stillA)).toBe(false);
  expect(mockDisk.has(stillB)).toBe(true);
});

describe('saving downloaded results', () => {
  const workflow = { '3': { class_type: 'KSampler', inputs: { seed: 7 } } } as any;
  const download = (n = 0) => `file:///cache/comfy-downloads/${n}-abc.mp4`;
  const sourceId = (n = 0) => JSON.stringify([`out${n}.mp4`, '', 'output']);
  const options = (n = 0, promptId = 'prompt') => ({
    serverId: 'server',
    workflowId: 'workflow',
    mediaUrl: download(n),
    workflow,
    promptId,
    sourceId: sourceId(n),
  });
  const save = () => saveGeneratedMedia(options());

  beforeEach(async () => {
    mockCopies.length = 0;
    useMediaStore.setState({ assets: [] });
    await AsyncStorage.clear();
    resetWorkflowSnapshotsForTest();
    (AsyncStorage.setItem as jest.Mock).mockClear();
  });

  test('moves the download into the gallery instead of copying it', async () => {
    mockDisk.add(download());
    const { path } = await save();
    expect(path).toMatch(/^file:\/\/\/docs\/media-v2\/.+\.mp4$/);
    expect(mockCopies).toEqual([]);
    expect(mockDisk.has(download())).toBe(false);
    expect(mockDisk.has(path)).toBe(true);
    expect(useMediaStore.getState().assets.map((item) => item.path)).toEqual([path]);
  });

  test('a duplicate download is deleted, not left in the cache', async () => {
    mockDisk.add(download());
    const first = await save();
    mockDisk.add(download());
    const second = await save();
    expect(second.path).toBe(first.path);
    expect(mockDisk.has(download())).toBe(false);
    expect(useMediaStore.getState().assets).toHaveLength(1);
  });

  test('a single save is in the persisted index when it resolves', async () => {
    mockDisk.add(download());
    const { path } = await save();
    expect((await persistedAssets()).map((item) => item.path)).toEqual([path]);
  });

  test('the asset references a workflow snapshot instead of embedding a copy', async () => {
    mockDisk.add(download());
    await save();
    const [saved] = await persistedAssets();
    expect(saved.metadata.workflow).toBeUndefined();
    expect(saved.metadata.workflowKey).toEqual(expect.any(String));
    expect(await getAssetWorkflow(saved)).toEqual(workflow);
    // The caller's object stays theirs.
    workflow['3'].inputs.seed = 8;
    expect(await getAssetWorkflow(saved)).toEqual({ '3': { class_type: 'KSampler', inputs: { seed: 7 } } });
    workflow['3'].inputs.seed = 7;
  });

  test("a job's outputs cost one index write and share one snapshot", async () => {
    const batch = beginMediaSaveBatch();
    const paths: string[] = [];
    for (let n = 0; n < 4; n++) {
      mockDisk.add(download(n));
      paths.push((await batch.save(options(n))).path);
    }
    // Visible at once, written once.
    expect(useMediaStore.getState().assets).toHaveLength(4);
    expect(indexWrites()).toHaveLength(0);
    await batch.commit();
    expect(indexWrites()).toHaveLength(1);
    expect((await persistedAssets()).map((item) => item.path).sort()).toEqual([...paths].sort());
    const snapshotKeys = (await AsyncStorage.getAllKeys()).filter((key) => key.startsWith(WORKFLOW_SNAPSHOT_PREFIX));
    expect(snapshotKeys).toHaveLength(1);
    // Committing again is a no-op.
    await batch.commit();
    expect(indexWrites()).toHaveLength(1);
  });

  test('each file is journaled before it arrives, and the journal goes once the index is durable', async () => {
    const batch = beginMediaSaveBatch();
    mockDisk.add(download());
    const { path } = await batch.save(options());
    const journal = path + '.json';
    expect(mockOps.indexOf(`write:${journal}`)).toBeLessThan(mockOps.indexOf(`move:${path}`));
    const journaled = JSON.parse(mockText.get(journal)!);
    expect(journaled).toMatchObject({ promptId: 'prompt', sourceId: sourceId(), workflowKey: expect.any(String) });
    expect(mockDisk.has(journal)).toBe(true);
    await batch.commit();
    expect(mockDisk.has(journal)).toBe(false);
  });

  test('a failed transfer leaves no journal behind', async () => {
    const batch = beginMediaSaveBatch();
    mockDisk.add(download());
    mockFailingMoves.add(download());
    await expect(batch.save(options())).rejects.toThrow('move failed');
    mockFailingMoves.clear();
    await batch.commit();
    expect([...mockDisk].filter((uri) => uri.endsWith('.json'))).toEqual([]);
  });

  test('a snapshot outlives deletes until nothing references it', async () => {
    const batch = beginMediaSaveBatch();
    const paths: string[] = [];
    for (let n = 0; n < 2; n++) {
      mockDisk.add(download(n));
      paths.push((await batch.save(options(n))).path);
    }
    await batch.commit();
    const snapshots = async () =>
      (await AsyncStorage.getAllKeys()).filter((key) => key.startsWith(WORKFLOW_SNAPSHOT_PREFIX));
    await deleteGeneratedMedia([paths[0]]);
    expect(await snapshots()).toHaveLength(1);
    await deleteGeneratedMedia([paths[1]]);
    expect(await snapshots()).toHaveLength(0);
    // A later save of the same workflow writes it again.
    mockDisk.add(download(5));
    const { metadata } = await saveGeneratedMedia(options(5, 'again'));
    expect(await snapshots()).toHaveLength(1);
    expect(await getAssetWorkflow({ ...asset('x'), metadata })).toEqual(workflow);
  });

  test('when the snapshot cannot be written the workflow stays embedded', async () => {
    jest.spyOn(AsyncStorage, 'multiSet').mockRejectedValueOnce(new Error('disk full'));
    jest.spyOn(console, 'warn').mockImplementationOnce(() => {});
    mockDisk.add(download());
    const { metadata } = await save();
    expect(metadata.workflowKey).toBeUndefined();
    expect(metadata.workflow).toEqual(workflow);
  });
});
