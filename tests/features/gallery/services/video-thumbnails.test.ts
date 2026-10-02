/** Stills for video tiles: made once, a few at a time, by players that never outlive the job. */
import { stillFile } from '@/features/gallery/services/video-still-file';
import { peekVideoStill, requestVideoStill, subscribeVideoStills } from '@/features/gallery/services/video-thumbnails';

const mockDisk = new Set<string>();
const mockPlayers: { uri: string; released: boolean; finish: () => void; fail: () => void }[] = [];

jest.mock('expo-file-system', () => ({
  Paths: { cache: 'cache' },
  Directory: jest.fn().mockImplementation(() => ({ create: () => {} })),
  File: jest.fn().mockImplementation((pathOrDirectory: unknown, name?: string) => {
    const uri = name ? `file:///cache/video-thumbnails/${name}` : String(pathOrDirectory);
    return {
      uri,
      get exists() {
        return mockDisk.has(uri);
      },
      delete: () => mockDisk.delete(uri),
      move: async (target: { uri: string }) => {
        mockDisk.delete(uri);
        mockDisk.add(target.uri);
      },
    };
  }),
}));
jest.mock('expo-image-manipulator', () => ({
  SaveFormat: { JPEG: 'jpeg' },
  ImageManipulator: {
    manipulate: () => ({
      renderAsync: async () => ({
        saveAsync: async () => {
          mockDisk.add('file:///cache/ImageManipulator/out.jpg');
          return { uri: 'file:///cache/ImageManipulator/out.jpg' };
        },
      }),
    }),
  },
}));
jest.mock('expo-video', () => ({
  createVideoPlayer: (uri: string) => {
    let finish = () => {};
    let fail = () => {};
    const frame = new Promise<object[]>((resolve, reject) => {
      finish = () => resolve([{}]);
      fail = () => reject(new Error('unreadable'));
    });
    const player = {
      uri,
      released: false,
      finish,
      fail,
      generateThumbnailsAsync: () => frame,
      release: () => {
        player.released = true;
      },
    };
    mockPlayers.push(player);
    return player;
  },
}));

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  mockDisk.clear();
  mockPlayers.length = 0;
});

test('a still is made once however many tiles ask, and its player is released', async () => {
  const notified = jest.fn();
  const unsubscribe = subscribeVideoStills(notified);
  const first = requestVideoStill('file:///media-v2/once.mp4');
  const second = requestVideoStill('file:///media-v2/once.mp4');
  expect(peekVideoStill('file:///media-v2/once.mp4')).toBeUndefined();
  expect(mockPlayers).toHaveLength(1);

  mockPlayers[0].finish();
  const still = stillFile('file:///media-v2/once.mp4').uri;
  expect(await first).toBe(still);
  expect(await second).toBe(still);
  expect(mockDisk.has(still)).toBe(true);
  expect(mockPlayers[0].released).toBe(true);
  expect(peekVideoStill('file:///media-v2/once.mp4')).toBe(still);
  expect(notified).toHaveBeenCalledTimes(1);
  unsubscribe();
});

test('no more than two stills are made at once', async () => {
  const uris = ['a', 'b', 'c', 'd'].map((name) => `file:///media-v2/queue-${name}.mp4`);
  const jobs = uris.map((uri) => requestVideoStill(uri));
  expect(mockPlayers.map((player) => player.uri)).toEqual(uris.slice(0, 2));

  mockPlayers[0].finish();
  await flush();
  expect(mockPlayers.map((player) => player.uri)).toEqual(uris.slice(0, 3));

  mockPlayers.slice(1).forEach((player) => player.finish());
  await flush();
  mockPlayers[3].finish();
  await Promise.all(jobs);
  expect(mockPlayers.every((player) => player.released)).toBe(true);
});

test('a still already on disk is used without a player', async () => {
  const uri = 'file:///media-v2/cached.mp4';
  mockDisk.add(stillFile(uri).uri);
  expect(peekVideoStill(uri)).toBe(stillFile(uri).uri);
  expect(await requestVideoStill(uri)).toBe(stillFile(uri).uri);
  expect(mockPlayers).toHaveLength(0);
});

test('a video that cannot give a still settles on null and frees its player', async () => {
  const uri = 'file:///media-v2/broken.mp4';
  const job = requestVideoStill(uri);
  mockPlayers[0].fail();
  expect(await job).toBeNull();
  expect(mockPlayers[0].released).toBe(true);
  expect(peekVideoStill(uri)).toBeNull();
});

test('a still can be cached under its own key rather than the URL it is made from', async () => {
  const uri = 'https://box/view?filename=a.mp4&token=secret';
  const key = 'https://box/view?filename=a.mp4#10@monday';
  const job = requestVideoStill(uri, { key });
  expect(mockPlayers[0].uri).toBe(uri);
  mockPlayers[0].finish();
  expect(await job).toBe(stillFile(key).uri);
  expect(peekVideoStill(key)).toBe(stillFile(key).uri);
  expect(mockDisk.has(stillFile(uri).uri)).toBe(false);
});

test('a request given up before its turn is dropped, unless another tile still wants it', async () => {
  const busy = ['x', 'y'].map((name) => requestVideoStill(`file:///media-v2/busy-${name}.mp4`));
  const left = new AbortController();
  const dropped = requestVideoStill('file:///media-v2/scrolled-away.mp4', { signal: left.signal });
  const shared = 'file:///media-v2/shared.mp4';
  const leaving = new AbortController();
  const sharedJob = requestVideoStill(shared, { signal: leaving.signal });
  void requestVideoStill(shared);

  left.abort();
  leaving.abort();
  expect(await dropped).toBeUndefined();
  expect(peekVideoStill('file:///media-v2/scrolled-away.mp4')).toBeUndefined();

  mockPlayers[0].finish();
  mockPlayers[1].finish();
  await Promise.all(busy);
  await flush();
  // The dropped video never got a player; the shared one did.
  expect(mockPlayers.map((player) => player.uri)).toEqual([
    'file:///media-v2/busy-x.mp4',
    'file:///media-v2/busy-y.mp4',
    shared,
  ]);
  mockPlayers[2].finish();
  expect(await sharedJob).toBe(stillFile(shared).uri);
});

test('giving up after the still has started lets it finish', async () => {
  const controller = new AbortController();
  const uri = 'file:///media-v2/started.mp4';
  const job = requestVideoStill(uri, { signal: controller.signal });
  controller.abort();
  mockPlayers[0].finish();
  expect(await job).toBe(stillFile(uri).uri);
});
