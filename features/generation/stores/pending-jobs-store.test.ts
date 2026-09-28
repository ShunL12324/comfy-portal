import { usePendingJobsStore } from './pending-jobs-store';
import type { Workflow } from '@/features/workflow/types';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

beforeEach(async () => {
  await usePendingJobsStore.persist.rehydrate();
  usePendingJobsStore.setState({ jobs: [] });
});
test('server-scoped prompt ids do not cancel or rename another server task', () => {
  const state = usePendingJobsStore.getState();
  state.addJob({ serverId: 'a', promptId: 'shared', workflowId: 'w', queuedAt: 1 });
  state.addJob({ serverId: 'b', promptId: 'shared', workflowId: 'w', queuedAt: 2 });
  state.replaceJobId('a', 'shared', 'assigned');
  expect(usePendingJobsStore.getState().jobs.map((j) => j.promptId)).toEqual(['assigned', 'shared']);
  state.removeJob('a', 'assigned');
  expect(usePendingJobsStore.getState().jobs.map((j) => j.serverId)).toEqual(['b']);
});
test('a task owns its submitted graph and server id correction deduplicates recovery', () => {
  const graph: Workflow = { '1': { id: '1', class_type: 'KSampler', inputs: { seed: 42 }, _meta: undefined } };
  const state = usePendingJobsStore.getState();
  state.addJob({ serverId: 'a', promptId: 'chosen', workflowId: 'w', queuedAt: 1, workflowSnapshot: graph });
  graph['1'].inputs.seed = 99;
  state.addJob({ serverId: 'a', promptId: 'assigned', workflowId: 'w', queuedAt: 2 });
  state.replaceJobId('a', 'chosen', 'assigned');
  expect(usePendingJobsStore.getState().jobs).toHaveLength(1);
  expect(usePendingJobsStore.getState().jobs[0].workflowSnapshot?.['1'].inputs.seed).toBe(42);
});
