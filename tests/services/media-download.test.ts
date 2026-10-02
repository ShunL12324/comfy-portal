import { AppState, Platform } from 'react-native';
import { diag } from '@/utils/diagnostics';
import {
  DownloadHttpError,
  MAX_DOWNLOAD_ATTEMPTS,
  STALL_TIMEOUT_MS,
  downloadToCache,
  logName,
} from '@/services/media-download';

/** Sizes of files on the fake disk, by URI. */
const mockDisk = new Map<string, number>();
/** Every download task created, oldest first. */
const mockTasks: any[] = [];
const mockAppState = { currentState: 'active', listeners: new Set<(state: string) => void>() };

jest.mock('@/utils/diagnostics', () => ({
  diag: jest.fn(),
  redactUrl: jest.requireActual('@/utils/diagnostics').redactUrl,
}));
jest.mock('expo-file-system', () => {
  class MockFile {
    uri: string;
    constructor(parent: string | { uri: string }, name?: string) {
      this.uri = typeof parent === 'string' ? parent : `${parent.uri}${name}`;
    }
    get exists() {
      return mockDisk.has(this.uri);
    }
    get size() {
      return mockDisk.get(this.uri) ?? 0;
    }
    delete() {
      mockDisk.delete(this.uri);
    }
    static createDownloadTask(url: string, destination: MockFile, options: any) {
      return new MockTask(url, destination, options);
    }
  }

  /** A download task the test drives by hand. */
  class MockTask {
    state = 'idle';
    resumeData?: string;
    runs: string[] = [];
    pause = jest.fn(() => {
      if (this.state !== 'active') throw new Error('not active');
      this.pauseRequested = true;
    });
    release = jest.fn();
    pauseRequested = false;
    restoredFrom?: unknown;
    private current?: { resolve: (file: MockFile | null) => void; reject: (error: unknown) => void };

    url: string;
    destination: MockFile;
    options: any;

    constructor(url: string, destination: MockFile, options: any) {
      this.url = url;
      this.destination = destination;
      this.options = options;
      mockTasks.push(this);
    }

    private run(kind: string) {
      this.runs.push(kind);
      this.state = 'active';
      this.pauseRequested = false;
      const signal: AbortSignal | undefined = this.options?.signal;
      return new Promise<MockFile | null>((resolve, reject) => {
        this.current = { resolve, reject };
        signal?.addEventListener('abort', () => this.cancel(), { once: true });
      }).catch((error) => {
        if (signal?.aborted) {
          const abort = new Error('The operation was aborted.');
          abort.name = 'AbortError';
          throw abort;
        }
        throw error;
      });
    }
    downloadAsync() {
      return this.run('download');
    }
    resumeAsync() {
      if (!this.resumeData) return Promise.reject(new Error('No resume data available.'));
      return this.run('resume');
    }
    savable() {
      if (this.state !== 'paused') throw new Error('not paused');
      return { resumeData: this.resumeData };
    }
    cancel() {
      if (['completed', 'cancelled', 'error'].includes(this.state)) return;
      this.state = 'cancelled';
      this.current?.reject(new Error('Download was cancelled'));
    }

    // Test controls.
    progress(bytesWritten: number, totalBytes: number) {
      this.options.onProgress?.({ bytesWritten, totalBytes });
    }
    complete(size: number) {
      mockDisk.set(this.destination.uri, size);
      this.state = 'completed';
      this.current!.resolve(new MockFile(this.destination.uri));
    }
    fail(message: string, partial?: number) {
      if (partial !== undefined) mockDisk.set(this.destination.uri, partial);
      this.state = 'error';
      this.current!.reject(new Error(message));
    }
    finishPause(resumeData?: string) {
      this.resumeData = resumeData;
      this.state = 'paused';
      this.current!.resolve(null);
    }

    static fromSavable(state: { url: string; fileUri: string; resumeData: string }, options: any) {
      const task = new MockTask(state.url, new MockFile(state.fileUri), options);
      task.resumeData = state.resumeData;
      task.state = 'paused';
      task.restoredFrom = state;
      return task;
    }
  }

  class MockDirectory {
    uri: string;
    constructor(parent: { uri: string }, name: string) {
      this.uri = `${parent.uri}${name}/`;
    }
    create() {}
  }

  return {
    File: MockFile,
    Directory: MockDirectory,
    DownloadTask: MockTask,
    Paths: { cache: { uri: 'file:///cache/' } },
  };
});

const SRC_URL = 'http://server:8188/view?filename=result.mp4&token=secret';
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
const setAppState = (state: string) => {
  mockAppState.currentState = state;
  mockAppState.listeners.forEach((listener) => listener(state));
};
const lastTask = () => mockTasks[mockTasks.length - 1];
const diagEvents = () => jest.mocked(diag).mock.calls.map(([, event]) => event);

const setPlatform = (os: 'ios' | 'android') => jest.replaceProperty(Platform, 'OS', os);

beforeEach(() => {
  mockDisk.clear();
  mockTasks.length = 0;
  setPlatform('ios');
  mockAppState.currentState = 'active';
  mockAppState.listeners.clear();
  Object.defineProperty(AppState, 'currentState', { configurable: true, get: () => mockAppState.currentState });
  jest.spyOn(AppState, 'addEventListener').mockImplementation(((_event: string, listener: (state: string) => void) => {
    mockAppState.listeners.add(listener);
    return { remove: () => mockAppState.listeners.delete(listener) };
  }) as any);
  jest.mocked(diag).mockClear();
});

afterEach(() => jest.restoreAllMocks());

test('a download lands in the cache through the foreground session, reporting progress', async () => {
  const onProgress = jest.fn();
  const download = downloadToCache(SRC_URL, { name: 'ComfyUI_00042_.mp4', onProgress });
  await flush();
  const task = lastTask();
  expect(task.url).toBe(SRC_URL);
  expect(task.options.sessionType).toBe('foreground');
  expect(task.destination.uri).toMatch(/^file:\/\/\/cache\/comfy-downloads\/\d+-\w+\.mp4$/);

  task.progress(10, -1); // no Content-Length: nothing to report
  task.progress(25, 100);
  task.progress(25, 100);
  task.progress(20, 100); // never backwards
  task.progress(100, 100);
  task.complete(100);

  await expect(download).resolves.toBe(task.destination.uri);
  expect(onProgress.mock.calls.map(([fraction]) => fraction)).toEqual([0.25, 1]);
  expect(task.release).toHaveBeenCalled();
  // Timing is logged without the full file name or the SRC_URL.
  const done = jest.mocked(diag).mock.calls.find(([, event]) => event === 'done')!;
  expect(done[0]).toBe('download');
  expect(done[2]).toMatchObject({ file: 'ComfyU….mp4', bytes: 100, session: 'foreground', attempts: 1 });
  expect(typeof done[2]!.ms).toBe('number');
  expect(JSON.stringify(jest.mocked(diag).mock.calls)).not.toContain('secret');
});

test('an HTTP error status is rejected without a retry and nothing stays in the cache', async () => {
  const download = downloadToCache(SRC_URL, { name: 'a.png' });
  await flush();
  const task = lastTask();
  task.fail('Unable to download a file: server returned HTTP 401', 0);

  const error = await download.catch((e) => e);
  expect(error).toBeInstanceOf(DownloadHttpError);
  expect(error.status).toBe(401);
  expect(error.message).toBe('Failed to download a.png (HTTP 401)');
  expect(mockTasks).toHaveLength(1);
  expect(mockDisk.has(task.destination.uri)).toBe(false);
});

test('Android reports the status in its own words', async () => {
  setPlatform('android');
  const download = downloadToCache(SRC_URL, { name: 'a.png' });
  await flush();
  lastTask().fail('Unable to download a file: HTTP 404');
  await expect(download).rejects.toMatchObject({ status: 404 });
});

test('aborting cancels the transfer, does not retry, and discards the partial file', async () => {
  const controller = new AbortController();
  const download = downloadToCache(SRC_URL, { name: 'a.png', signal: controller.signal });
  await flush();
  const task = lastTask();
  mockDisk.set(task.destination.uri, 50);
  controller.abort();

  await expect(download).rejects.toMatchObject({ name: 'AbortError' });
  expect(task.state).toBe('cancelled');
  expect(mockTasks).toHaveLength(1);
  expect(mockDisk.size).toBe(0);
});

test('an already aborted signal starts nothing', async () => {
  const controller = new AbortController();
  controller.abort();
  await expect(downloadToCache(SRC_URL, { name: 'a.png', signal: controller.signal })).rejects.toMatchObject({
    name: 'AbortError',
  });
  expect(mockTasks).toHaveLength(0);
});

test('leaving the app pauses the transfer and returning resumes it from the resume data', async () => {
  const onProgress = jest.fn();
  const download = downloadToCache(SRC_URL, { name: 'a.mp4', onProgress });
  await flush();
  const task = lastTask();
  task.progress(40, 100);

  setAppState('inactive'); // the app switcher alone does not pause
  expect(task.pause).not.toHaveBeenCalled();
  setAppState('background');
  expect(task.pause).toHaveBeenCalledTimes(1);
  task.finishPause('opaque-resume-data');
  await flush();
  expect(task.runs).toEqual(['download']); // waits for the app to return

  setAppState('active');
  await flush();
  expect(task.runs).toEqual(['download', 'resume']);
  task.progress(100, 100);
  task.complete(100);

  await expect(download).resolves.toBe(task.destination.uri);
  expect(mockTasks).toHaveLength(1);
  expect(onProgress.mock.calls.map(([fraction]) => fraction)).toEqual([0.4, 1]);
  const done = jest.mocked(diag).mock.calls.find(([, event]) => event === 'done')!;
  expect(done[2]).toMatchObject({ attempts: 1, backgroundPauses: 1 });
  // The app-state listener is gone once the download settles.
  expect(mockAppState.listeners.size).toBe(0);
});

test('a second pause request while one is in flight is ignored', async () => {
  const download = downloadToCache(SRC_URL, { name: 'a.mp4' });
  await flush();
  const task = lastTask();
  setAppState('background');
  setAppState('background');
  expect(task.pause).toHaveBeenCalledTimes(1);
  task.finishPause('resume-data');
  setAppState('active');
  await flush();
  expect(task.runs).toEqual(['download', 'resume']);
  task.complete(1);
  await download;
});

test('a pause without resume data starts over when the app returns', async () => {
  const download = downloadToCache(SRC_URL, { name: 'a.png' });
  await flush();
  const first = lastTask();
  setAppState('background');
  first.finishPause(undefined);
  await flush();
  setAppState('active');
  await flush();

  const second = lastTask();
  expect(second).not.toBe(first);
  expect(first.release).toHaveBeenCalled();
  expect(second.runs).toEqual(['download']);
  second.complete(10);
  await expect(download).resolves.toBe(second.destination.uri);
});

test('a download started while the app is in the background waits for it to return', async () => {
  mockAppState.currentState = 'background';
  const download = downloadToCache(SRC_URL, { name: 'a.png' });
  await flush();
  expect(lastTask().runs).toEqual([]);
  setAppState('active');
  await flush();
  expect(lastTask().runs).toEqual(['download']);
  lastTask().complete(1);
  await download;
});

test('Android keeps downloading in the background', async () => {
  setPlatform('android');
  const download = downloadToCache(SRC_URL, { name: 'a.png' });
  await flush();
  setAppState('background');
  expect(lastTask().pause).not.toHaveBeenCalled();
  lastTask().complete(1);
  await download;
});

test('Android resumes a dropped connection from the bytes already on disk', async () => {
  setPlatform('android');
  const download = downloadToCache(SRC_URL, { name: 'a.mp4' });
  await flush();
  const first = lastTask();
  first.fail('Unable to download a file: unexpected end of stream', 4096);
  await flush();

  const second = lastTask();
  expect(second.restoredFrom).toEqual({
    url: SRC_URL,
    fileUri: first.destination.uri,
    isDirectory: false,
    resumeData: '4096',
  });
  expect(second.runs).toEqual(['resume']);
  second.complete(8192);
  await expect(download).resolves.toBe(first.destination.uri);
  expect(diagEvents()).toEqual(['retry', 'done']);
});

test('iOS retries a dropped connection from the start, and gives up after the last attempt', async () => {
  const download = downloadToCache(SRC_URL, { name: 'a.png' });
  for (let attempt = 1; attempt <= MAX_DOWNLOAD_ATTEMPTS; attempt++) {
    await flush();
    expect(mockTasks).toHaveLength(attempt);
    expect(lastTask().runs).toEqual(['download']);
    lastTask().fail('Unable to download a file: The network connection was lost.', 100);
  }
  await expect(download).rejects.toThrow('network connection was lost');
  expect(mockDisk.size).toBe(0);
  expect(diagEvents()).toEqual(['retry', 'retry', 'failed']);
});

test('a stalled transfer is paused and resumed on a new connection', async () => {
  jest.useFakeTimers();
  try {
    const download = downloadToCache(SRC_URL, { name: 'a.mp4' });
    await jest.advanceTimersByTimeAsync(0);
    const task = lastTask();
    task.progress(30, 100);
    await jest.advanceTimersByTimeAsync(STALL_TIMEOUT_MS - 1000);
    expect(task.pause).not.toHaveBeenCalled();
    await jest.advanceTimersByTimeAsync(5000);
    expect(task.pause).toHaveBeenCalledTimes(1);
    task.finishPause('resume-data');
    await jest.advanceTimersByTimeAsync(0);
    expect(task.runs).toEqual(['download', 'resume']);
    task.complete(100);
    await expect(download).resolves.toBe(task.destination.uri);
  } finally {
    jest.useRealTimers();
  }
});

test('log names keep only a prefix and the extension', () => {
  expect(logName('ComfyUI_00042_.png')).toBe('ComfyU….png');
  expect(logName('a.png')).toBe('a.png');
  expect(logName('no-extension-name')).toBe('no-ext…');
});
