/**
 * Backgrounding parks every client's socket without dropping its tracked
 * prompts; coming back replaces the sockets rather than trusting them.
 */
import { AppState } from 'react-native';
import { getClient, watchAppState } from '@/features/generation/services/job-recovery';
import { ComfyClient } from '@/services/comfy-client';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('@/utils/toast', () => ({ showToast: { error: jest.fn(), success: jest.fn(), info: jest.fn() } }));
jest.mock('@/utils/diagnostics', () => ({ diag: jest.fn(), redactUrl: (url: string) => url }));
jest.mock('@/services/storage-migration', () => ({ runStorageMigrations: jest.fn(async () => {}) }));
jest.mock('@/features/generation/stores/pending-jobs-store', () => ({
  getPendingJobs: jest.fn(() => []),
  usePendingJobsStore: {
    getState: () => ({ removeJob: jest.fn() }),
    persist: { hasHydrated: () => true, onFinishHydration: () => () => {} },
  },
}));

test('background suspends clients and foreground resumes them', () => {
  let listener: ((state: string) => void) | undefined;
  const remove = jest.fn();
  jest.spyOn(AppState, 'addEventListener').mockImplementation(((_type: string, handler: (state: string) => void) => {
    listener = handler;
    return { remove };
  }) as any);
  const suspend = jest.spyOn(ComfyClient.prototype, 'suspend').mockImplementation(() => {});
  const resume = jest.spyOn(ComfyClient.prototype, 'resume').mockResolvedValue();
  const disconnect = jest.spyOn(ComfyClient.prototype, 'disconnect');

  const client = getClient({ id: 'server-1', host: 'comfy.test', port: 8188, useSSL: 'Never' } as any);
  const unwatch = watchAppState();

  listener!('inactive');
  expect(suspend).not.toHaveBeenCalled();
  expect(resume).not.toHaveBeenCalled();

  listener!('background');
  expect(suspend).toHaveBeenCalledTimes(1);
  expect(suspend.mock.instances[0]).toBe(client);
  expect(disconnect).not.toHaveBeenCalled();

  listener!('active');
  expect(resume).toHaveBeenCalledTimes(1);
  expect(resume.mock.instances[0]).toBe(client);
  // Still the same client: tracked prompts survive the trip.
  expect(getClient({ id: 'server-1', host: 'comfy.test', port: 8188, useSSL: 'Never' } as any)).toBe(client);

  unwatch();
  expect(remove).toHaveBeenCalled();
});
