/**
 * One Generate press queues one prompt.
 *
 * The button stays enabled while runs are in flight, because queueing several
 * is allowed. A second press that lands while the first is still being
 * submitted (onPre hooks, socket liveness check, POST /prompt) used to queue
 * the same run twice.
 */
import { createElement } from 'react';
import { act, create } from 'react-test-renderer';
import { GenerationProvider, useGenerationActions } from '@/features/generation/context/generation-context';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
jest.mock('@/utils/toast', () => ({ showToast: { error: jest.fn(), success: jest.fn(), info: jest.fn() } }));
jest.mock('@/utils/diagnostics', () => ({ diag: jest.fn(), redactUrl: (url: string) => url }));
jest.mock('@/store/install-id', () => ({ getInstallId: () => 'install' }));
jest.mock('@/features/server/stores/server-store', () => ({
  useServersStore: { getState: () => ({ servers: [{ id: 'server-1' }] }) },
}));
jest.mock('@/features/workflow/stores/workflow-store', () => ({
  useWorkflowStore: { getState: () => ({ workflow: [], updateUsage: jest.fn() }) },
}));
jest.mock('@/features/generation/stores/pending-jobs-store', () => ({
  pendingJobStorage: { flush: async () => {} },
  usePendingJobsStore: {
    getState: () => ({ addJob: jest.fn(), removeJob: jest.fn(), replaceJobId: jest.fn() }),
  },
}));

const mockClient = {
  onQueueUpdate: undefined as unknown,
  ensureLive: jest.fn(async () => true),
  isConnected: () => true,
  submitPrompt: jest.fn(),
};
jest.mock('@/features/generation/services/job-recovery', () => ({
  getClient: () => mockClient,
  getExistingClient: () => mockClient,
  finalizeJob: jest.fn(async () => ['file:///result.png']),
  reconcileAll: jest.fn(async () => {}),
}));

const WORKFLOW = { '1': { class_type: 'A', inputs: {} } } as any;

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

test('presses while a submit is in flight are ignored; later ones queue again', async () => {
  let actions!: ReturnType<typeof useGenerationActions>;
  const Probe = () => {
    actions = useGenerationActions();
    return null;
  };
  await act(async () => {
    create(createElement(GenerationProvider, null, createElement(Probe)));
  });

  const firstSubmit = deferred<{ promptId: string; completion: Promise<void> }>();
  const firstCompletion = deferred<void>();
  mockClient.submitPrompt.mockReturnValueOnce(firstSubmit.promise);

  let first!: Promise<void>;
  await act(async () => {
    first = actions.generate(WORKFLOW, 'workflow-1', 'server-1');
    void actions.generate(WORKFLOW, 'workflow-1', 'server-1');
    void actions.generate(WORKFLOW, 'workflow-1', 'server-1');
  });
  expect(mockClient.submitPrompt).toHaveBeenCalledTimes(1);

  // Once the first prompt is with the server, queueing another is allowed.
  await act(async () => {
    firstSubmit.resolve({ promptId: 'p1', completion: firstCompletion.promise });
  });
  const secondCompletion = deferred<void>();
  mockClient.submitPrompt.mockResolvedValueOnce({ promptId: 'p2', completion: secondCompletion.promise });
  let second!: Promise<void>;
  await act(async () => {
    second = actions.generate(WORKFLOW, 'workflow-1', 'server-1');
  });
  expect(mockClient.submitPrompt).toHaveBeenCalledTimes(2);

  await act(async () => {
    firstCompletion.resolve();
    secondCompletion.resolve();
    await Promise.all([first, second]);
  });
});
