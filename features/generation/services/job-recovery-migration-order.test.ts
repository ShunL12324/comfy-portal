/**
 * Job recovery must not read the media index before the migration has filled it.
 *
 * Recovery decides what to download by asking which of a prompt's outputs are
 * already saved. Media still sitting in the pre-migration per-machine layout is
 * invisible to that check, so reconciling first would download every old job's
 * results a second time. Source order alone does not prove this — an
 * un-awaited call would read exactly the same — so the test holds the migration
 * open and watches whether recovery proceeds without it.
 */
const mockOrder: string[] = [];
const mockMigration: { resolve?: () => void } = {};

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Pulls the Gluestack icon tree in through the toast UI; irrelevant here.
jest.mock('@/utils/toast', () => ({ showToast: { error: jest.fn(), success: jest.fn(), info: jest.fn() } }));

jest.mock('@/services/storage-migration', () => ({
  runStorageMigrations: jest.fn(
    () =>
      new Promise<void>((resolve) => {
        mockOrder.push('migration started');
        mockMigration.resolve = resolve;
      }),
  ),
}));

jest.mock('../stores/pending-jobs-store', () => ({
  getPendingJobs: jest.fn(() => {
    mockOrder.push('pending jobs read');
    return [];
  }),
  usePendingJobsStore: {
    getState: () => ({ removeJob: jest.fn() }),
    persist: { hasHydrated: () => true, onFinishHydration: () => () => {} },
  },
}));

import { reconcileAll } from './job-recovery';
import { runStorageMigrations } from '@/services/storage-migration';

const flush = () => new Promise((resolve) => setImmediate(resolve));

test('reconcile waits for the migration before reading anything', async () => {
  const reconciled = reconcileAll();

  await flush();
  expect(runStorageMigrations).toHaveBeenCalledTimes(1);
  // The migration is still open, so nothing downstream may have run yet.
  expect(mockOrder).toEqual(['migration started']);

  mockMigration.resolve!();
  await reconciled;

  expect(mockOrder).toEqual(['migration started', 'pending jobs read']);
});
