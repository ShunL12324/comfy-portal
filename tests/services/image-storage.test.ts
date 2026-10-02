import { useMediaStore, type MediaAsset } from '@/features/gallery/stores/media-store';
import { deleteGeneratedMedia, pruneMissingMedia } from '@/services/image-storage';
import { stillFile } from '@/features/gallery/services/video-still-file';

/** Paths that exist on the fake mockDisk; `delete()` takes them off it. */
const mockDisk = new Set<string>();
jest.mock('expo-file-system', () => ({
  // A file in a directory (a video's still) is keyed by its name alone.
  File: jest.fn().mockImplementation((path: string, name?: string) => {
    const uri = name ? `still:${name}` : path;
    return {
      uri,
      get exists() {
        return mockDisk.has(uri);
      },
      delete: () => mockDisk.delete(uri),
    };
  }),
  Directory: jest.fn(),
  Paths: {},
}));
jest.mock('@/features/workflow/stores/workflow-store', () => ({ useWorkflowStore: {} }));

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
