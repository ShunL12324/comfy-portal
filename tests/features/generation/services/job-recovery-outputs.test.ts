/**
 * A job's outputs reach `watchJobOutputs` listeners one by one as they are
 * saved, whichever finalize pass saves them, and even when the pass fails
 * part-way. The Run page relies on this to show results as they arrive.
 */
import { finalizeJob, watchJobOutputs } from '@/features/generation/services/job-recovery';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('@/utils/toast', () => ({ showToast: { error: jest.fn(), success: jest.fn(), info: jest.fn() } }));
jest.mock('@/utils/diagnostics', () => ({ diag: jest.fn(), redactUrl: (url: string) => url }));
jest.mock('@/services/storage-migration', () => ({ runStorageMigrations: jest.fn(async () => {}) }));
jest.mock('@/features/server/stores/server-store', () => ({
  useServersStore: {
    getState: () => ({ servers: [{ id: 'server-1', host: 'test', port: 8188, useSSL: 'Never' }] }),
    persist: { hasHydrated: () => true, onFinishHydration: () => () => {} },
  },
}));
jest.mock('@/features/generation/stores/pending-jobs-store', () => ({
  getPendingJobs: jest.fn(() => []),
  usePendingJobsStore: {
    getState: () => ({ removeJob: jest.fn() }),
    persist: { hasHydrated: () => true, onFinishHydration: () => () => {} },
  },
}));
jest.mock('@/services/image-storage', () => ({
  getGeneratedMedia: jest.fn(async () => []),
  // Finalizing saves through a batch: each save is visible at once, one index write on commit.
  beginMediaSaveBatch: () => ({
    save: jest.fn(async ({ mediaUrl }: { mediaUrl: string }) => ({ path: mediaUrl.replace('cache', 'docs') })),
    commit: jest.fn(async () => {}),
  }),
}));

type OnOutput = (uri: string, sourceId: string) => Promise<void>;
type Fetch = (
  promptId: string,
  callbacks: { onResultsFound?: (count: number) => void; onDownloadProgress?: (f: string, p: number) => void },
  saved: Set<string>,
  onOutput: OnOutput,
) => Promise<{ found: boolean; mediaUrls: string[] }>;

const mockFetch = jest.fn<ReturnType<Fetch>, Parameters<Fetch>>();
jest.mock('@/services/comfy-client', () => ({
  ComfyClient: jest.fn().mockImplementation(() => ({
    fetchAndDownloadResults: (...args: Parameters<Fetch>) => mockFetch(...args),
    disconnect: jest.fn(),
  })),
  classifyHistoryEntry: jest.fn(),
  errorMessageFromEntry: jest.fn(),
}));

const JOB = { promptId: 'p1', serverId: 'server-1', workflowId: 'wf', queuedAt: 0 };

function deferred<T = void>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

const flush = () => new Promise((resolve) => setImmediate(resolve));

beforeEach(() => mockFetch.mockReset());

test('listeners hear each saved output in order, and the ones before a failure survive it', async () => {
  // Three outputs; the second download fails, the third still arrives.
  mockFetch.mockImplementation(async (_id, callbacks, _saved, onOutput) => {
    callbacks.onResultsFound?.(3);
    callbacks.onDownloadProgress?.('a.png', 40);
    await onOutput('file:///cache/a.png', 'a');
    await onOutput('file:///cache/c.png', 'c');
    throw new Error('connection reset');
  });
  const events: string[] = [];
  const unwatch = watchJobOutputs('server-1', 'p1', {
    onResultsFound: (count) => events.push(`found ${count}`),
    onDownloadProgress: (progress) => events.push(`progress ${progress}`),
    onSaved: (uri) => events.push(`saved ${uri}`),
  });
  await expect(finalizeJob(JOB)).rejects.toThrow('connection reset');
  unwatch();
  expect(events).toEqual(['found 3', 'progress 40', 'saved file:///docs/a.png', 'saved file:///docs/c.png']);
});

test('a listener only hears its own job, and nothing after unsubscribing', async () => {
  mockFetch.mockImplementation(async (_id, callbacks, _saved, onOutput) => {
    callbacks.onResultsFound?.(1);
    await onOutput('file:///cache/a.png', 'a');
    return { found: true, mediaUrls: [] };
  });
  const other = jest.fn();
  const unwatchOther = watchJobOutputs('server-1', 'p2', { onSaved: other });
  const mine = jest.fn();
  const unwatch = watchJobOutputs('server-1', 'p1', { onSaved: mine });
  await finalizeJob(JOB);
  unwatch();
  await finalizeJob(JOB);
  unwatchOther();
  expect(mine).toHaveBeenCalledTimes(1);
  expect(other).not.toHaveBeenCalled();
});

test('a throwing listener does not fail the save', async () => {
  mockFetch.mockImplementation(async (_id, _callbacks, _saved, onOutput) => {
    await onOutput('file:///cache/a.png', 'a');
    return { found: true, mediaUrls: [] };
  });
  const unwatch = watchJobOutputs('server-1', 'p1', {
    onSaved: () => {
      throw new Error('listener bug');
    },
  });
  await expect(finalizeJob(JOB)).resolves.toEqual(['file:///docs/a.png']);
  unwatch();
});

test('the live path joins a pass already saving its job instead of returning early', async () => {
  const gate = deferred();
  mockFetch.mockImplementation(async (_id, _callbacks, _saved, onOutput) => {
    await gate.promise;
    await onOutput('file:///cache/a.png', 'a');
    return { found: true, mediaUrls: [] };
  });
  const saved: string[] = [];
  const unwatch = watchJobOutputs('server-1', 'p1', { onSaved: (uri) => saved.push(uri) });

  const owner = finalizeJob(JOB);
  await flush();
  // Without joining, a second caller learns nothing and returns at once.
  await expect(finalizeJob(JOB)).resolves.toBeNull();

  let joinedDone = false;
  const joined = finalizeJob(JOB, { joinInFlight: true }).then((result) => {
    joinedDone = true;
    return result;
  });
  await flush();
  expect(joinedDone).toBe(false);

  gate.resolve();
  await expect(joined).resolves.toBeNull();
  await expect(owner).resolves.toEqual(['file:///docs/a.png']);
  // The listener heard the owner's save, so the joining screen shows it.
  expect(saved).toEqual(['file:///docs/a.png']);
  expect(mockFetch).toHaveBeenCalledTimes(1);
  unwatch();
});
