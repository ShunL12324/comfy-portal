import { ComfyClient } from '@/services/comfy-client';
import * as FileSystem from 'expo-file-system/legacy';
jest.mock('@/store/install-id', () => ({ getInstallId: () => 'test' }));
jest.mock('@/services/network', () => ({
  buildServerUrl: jest.fn(
    async (_ssl: unknown, host: string, port: string, path: string) => `http://${host}:${port}${path}`,
  ),
  fetchWithAuth: jest.fn(),
}));
jest.mock('@/services/server-scheme', () => ({ resolveScheme: jest.fn() }));
jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: 'file:///cache/',
  makeDirectoryAsync: jest.fn(async () => {}),
  deleteAsync: jest.fn(async () => {}),
  createDownloadResumable: jest.fn(),
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

function clientWithOutputs(filenames: string[]) {
  const client = new ComfyClient({ host: 'test', port: '8188', useSSL: 'Never' });
  const images = filenames.map((filename) => ({ filename, subfolder: '', type: 'output' }));
  jest.spyOn(client, 'getHistory').mockResolvedValue({ prompt: { outputs: { '1': { images } } } });
  return client;
}

beforeEach(() => jest.mocked(FileSystem.deleteAsync).mockClear());

test('partial output recovery uses stable server identities, not changing download paths', async () => {
  const client = new ComfyClient({ host: 'test', port: '8188', useSSL: 'Never' });
  const images = ['first.png', 'second.png'].map((filename) => ({ filename, subfolder: '', type: 'output' }));
  jest.spyOn(client, 'getHistory').mockResolvedValue({ prompt: { outputs: { '1': { images } } } });
  const download = jest
    .spyOn(client as any, 'downloadMedia')
    .mockResolvedValueOnce('file:///cache/random-first.png')
    .mockRejectedValueOnce(new Error('network interrupted'))
    .mockResolvedValueOnce('file:///cache/new-second.png');
  const persisted = new Set<string>();
  const save = jest.fn(async (_uri: string, sourceId: string) => {
    persisted.add(sourceId);
  });
  await expect(client.fetchAndDownloadResults('prompt', {}, persisted, save)).rejects.toThrow('network interrupted');
  expect(persisted.size).toBe(1);
  await client.fetchAndDownloadResults('prompt', {}, persisted, save);
  expect(download.mock.calls.map((call) => call[0])).toEqual(['first.png', 'second.png', 'second.png']);
  expect(save).toHaveBeenCalledTimes(2);
  expect(persisted.size).toBe(2);
});
test('a failed local commit never adds the output to the completed set', async () => {
  const client = new ComfyClient({ host: 'test', port: '8188', useSSL: 'Never' });
  jest.spyOn(client, 'getHistory').mockResolvedValue({
    prompt: {
      outputs: {
        '1': {
          images: [{ filename: 'first.png', subfolder: '', type: 'output' }],
        },
      },
    },
  });
  jest.spyOn(client as any, 'downloadMedia').mockResolvedValue('file:///cache/result.png');
  const persisted = new Set<string>();
  await expect(
    client.fetchAndDownloadResults('prompt', {}, persisted, async () => {
      throw new Error('disk full');
    }),
  ).rejects.toThrow('disk full');
  expect(persisted.size).toBe(0);
});

test('downloads three outputs at a time but saves them in history order', async () => {
  const names = ['a.png', 'b.png', 'c.png', 'd.png', 'e.png'];
  const client = clientWithOutputs(names);
  const gates = new Map(names.map((name) => [name, deferred<string>()]));
  const started: string[] = [];
  jest.spyOn(client as any, 'downloadMedia').mockImplementation((async (filename: string) => {
    started.push(filename);
    return gates.get(filename)!.promise;
  }) as any);
  const saved: string[] = [];
  const run = client.fetchAndDownloadResults('prompt', {}, new Set(), async (uri) => {
    saved.push(uri);
  });
  await flush();
  expect(started).toEqual(['a.png', 'b.png', 'c.png']);
  // Finishing out of order frees a slot, but nothing is saved ahead of `a`.
  gates.get('c.png')!.resolve('file:///c');
  await flush();
  expect(started).toHaveLength(4);
  expect(saved).toEqual([]);
  for (const name of names) gates.get(name)!.resolve(`file:///${name[0]}`);
  const { mediaUrls } = await run;
  expect(saved).toEqual(['file:///a', 'file:///b', 'file:///c', 'file:///d', 'file:///e']);
  expect(mediaUrls).toEqual(saved);
});

test('one failed download does not cost the others, and only it is retried', async () => {
  const client = clientWithOutputs(['a.png', 'b.png', 'c.png']);
  const download = jest.spyOn(client as any, 'downloadMedia').mockImplementation((async (filename: string) => {
    if (filename === 'b.png') throw new Error('connection reset');
    return `file:///cache/${filename}`;
  }) as any);
  const persisted = new Set<string>();
  const save = jest.fn(async (_uri: string, sourceId: string) => {
    persisted.add(sourceId);
  });
  await expect(client.fetchAndDownloadResults('prompt', {}, persisted, save)).rejects.toThrow('connection reset');
  expect(save.mock.calls.map((call) => call[0])).toEqual(['file:///cache/a.png', 'file:///cache/c.png']);
  download.mockResolvedValue('file:///cache/b-again.png');
  download.mockClear();
  await client.fetchAndDownloadResults('prompt', {}, persisted, save);
  expect(download.mock.calls.map((call) => call[0])).toEqual(['b.png']);
  expect(persisted.size).toBe(3);
});

test('a failed save stops the batch and discards downloads it will not save', async () => {
  const client = clientWithOutputs(['a.png', 'b.png', 'c.png', 'd.png']);
  const download = jest
    .spyOn(client as any, 'downloadMedia')
    .mockImplementation((async (filename: string) => `file:///cache/${filename}`) as any);
  const save = jest.fn(async () => {
    throw new Error('disk full');
  });
  await expect(client.fetchAndDownloadResults('prompt', {}, new Set(), save)).rejects.toThrow('disk full');
  expect(save).toHaveBeenCalledTimes(1);
  // Every download that arrived is cleaned up, since none of them was saved.
  const downloaded = download.mock.calls.map((call) => `file:///cache/${call[0]}`);
  expect(
    jest
      .mocked(FileSystem.deleteAsync)
      .mock.calls.map((call) => call[0])
      .sort(),
  ).toEqual(downloaded.sort());
});

test('nothing new starts once a save has failed', async () => {
  const client = clientWithOutputs(['a.png', 'b.png', 'c.png', 'd.png', 'e.png']);
  const gates = new Map(['a.png', 'b.png', 'c.png', 'd.png'].map((name) => [name, deferred<string>()]));
  const download = jest
    .spyOn(client as any, 'downloadMedia')
    .mockImplementation((async (filename: string) => gates.get(filename)!.promise) as any);
  const run = client.fetchAndDownloadResults('prompt', {}, new Set(), async () => {
    throw new Error('disk full');
  });
  // `a` arriving frees a slot for `d` before its save fails; after that, `e`
  // must not start however many slots free up.
  gates.get('a.png')!.resolve('file:///cache/a.png');
  await flush();
  for (const name of ['b.png', 'c.png', 'd.png']) gates.get(name)!.resolve(`file:///cache/${name}`);
  await expect(run).rejects.toThrow('disk full');
  expect(download.mock.calls.map((call) => call[0])).toEqual(['a.png', 'b.png', 'c.png', 'd.png']);
});

test('progress covers the whole result set and is reported only when it changes', async () => {
  const client = clientWithOutputs(['a.mp4', 'b.mp4']);
  jest.spyOn(client as any, 'downloadMedia').mockImplementation((async (
    filename: string,
    _subfolder: string,
    _type: string,
    onProgress: (fraction: number) => void,
  ) => {
    for (const fraction of [0, 0.001, 0.002, 0.5, 0.5, 1]) onProgress(fraction);
    return `file:///cache/${filename}`;
  }) as any);
  const onDownloadProgress = jest.fn();
  await client.fetchAndDownloadResults('prompt', { onDownloadProgress }, new Set(), async () => {});
  const reported = onDownloadProgress.mock.calls.map((call) => call[1]);
  expect(reported).toEqual([...reported].sort((a, b) => a - b));
  expect(new Set(reported).size).toBe(reported.length);
  expect(reported.at(-1)).toBe(100);
  expect(Math.max(...reported.slice(0, -1))).toBeLessThan(100);
});

test('the /view URL encodes subfolder and type, and tolerates a missing subfolder', async () => {
  const urls: string[] = [];
  jest.mocked(FileSystem.createDownloadResumable).mockImplementation(((url: string, fileUri: string) => {
    urls.push(url);
    return { downloadAsync: async () => ({ uri: fileUri, status: 200 }) };
  }) as any);
  const client = new ComfyClient({ host: 'test', port: '8188', useSSL: 'Never' });
  jest.spyOn(client, 'getHistory').mockResolvedValue({
    prompt: {
      outputs: {
        '1': { images: [{ filename: 'a b.png', subfolder: 'my run/#1&x=y', type: 'output' }] },
        '2': { audio: [{ filename: 'c.flac', type: 'output' }] },
      },
    },
  });
  await client.fetchAndDownloadResults('prompt', {}, new Set(), async () => {});
  const params = urls.map((url) => new URL(url).searchParams);
  expect(params.map((query) => [query.get('filename'), query.get('subfolder'), query.get('type')])).toEqual([
    ['a b.png', 'my run/#1&x=y', 'output'],
    ['c.flac', '', 'output'],
  ]);
});

test('an HTTP error body is not left behind in the cache', async () => {
  jest.mocked(FileSystem.createDownloadResumable).mockImplementation(((_url: string, fileUri: string) => ({
    downloadAsync: async () => ({ uri: fileUri, status: 401 }),
  })) as any);
  const client = clientWithOutputs(['a.png']);
  await expect(client.fetchAndDownloadResults('prompt', {}, new Set(), async () => {})).rejects.toThrow('HTTP 401');
  expect(FileSystem.deleteAsync).toHaveBeenCalledTimes(1);
});
