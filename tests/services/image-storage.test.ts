import { useMediaStore, type MediaAsset } from '@/features/gallery/stores/media-store';
import { deleteGeneratedMedia, pruneMissingMedia, saveGeneratedMedia } from '@/services/image-storage';
import { stillFile } from '@/features/gallery/services/video-still-file';

/** Paths that exist on the fake mockDisk; `delete()` takes them off it. */
const mockDisk = new Set<string>();
/** Bytes written by copies; a move writes none. */
const mockCopies: string[] = [];
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
      delete: () => mockDisk.delete(file.uri),
      move: async (to: { uri: string }) => {
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
jest.mock('@/services/media-provenance', () => ({ resolveProvenance: () => ({}) }));

const asset = (id: string): MediaAsset => ({
  id,
  serverId: 'server',
  workflowId: 'workflow',
  kind: 'video',
  path: `file:///media-v2/${id}.mp4`,
  metadata: { timestamp: `2026-09-30T00:00:0${id.length}Z`, originalUrl: 'https://server/view', workflow: {} },
});

beforeEach(async () => {
  await useMediaStore.persist.rehydrate();
  mockDisk.clear();
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

describe('saving a downloaded result', () => {
  const download = 'file:///cache/comfy-downloads/123-abc.mp4';
  const sourceId = JSON.stringify(['out.mp4', '', 'output']);
  const save = () =>
    saveGeneratedMedia({
      serverId: 'server',
      workflowId: 'workflow',
      mediaUrl: download,
      workflow: {},
      promptId: 'prompt',
      sourceId,
    });

  beforeEach(() => {
    mockCopies.length = 0;
    useMediaStore.setState({ assets: [] });
  });

  test('moves the download into the gallery instead of copying it', async () => {
    mockDisk.add(download);
    const { path } = await save();
    expect(path).toMatch(/^file:\/\/\/docs\/media-v2\/.+\.mp4$/);
    expect(mockCopies).toEqual([]);
    expect(mockDisk.has(download)).toBe(false);
    expect(mockDisk.has(path)).toBe(true);
    expect(useMediaStore.getState().assets.map((item) => item.path)).toEqual([path]);
  });

  test('a duplicate download is deleted, not left in the cache', async () => {
    mockDisk.add(download);
    const first = await save();
    mockDisk.add(download);
    const second = await save();
    expect(second.path).toBe(first.path);
    expect(mockDisk.has(download)).toBe(false);
    expect(useMediaStore.getState().assets).toHaveLength(1);
  });
});
