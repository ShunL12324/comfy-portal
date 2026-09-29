import { createDurableStorage } from '@/services/durable-storage';
import type { Workflow } from '@/features/workflow/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/**
 * A generation that has been handed to a ComfyUI server but whose outputs
 * have not been saved locally yet.
 *
 * This registry is persisted because the WebSocket is only an optimisation:
 * the server buffers nothing for a disconnected client, so a completion that
 * lands while the app is backgrounded, killed, or off-network is lost unless
 * we can go back and ask about it over HTTP. An entry stays here until its
 * media is on disk (or the job is known to have failed).
 */
export interface PendingJob {
  promptId: string;
  serverId: string;
  workflowId: string;
  queuedAt: number;
  workflowSnapshot?: Workflow;
}

interface PendingJobsState {
  jobs: PendingJob[];
  addJob: (job: PendingJob) => void;
  removeJob: (serverId: string, promptId: string) => void;
  /** Correct the id in place when the server assigns one we didn't pick. */
  replaceJobId: (serverId: string, oldPromptId: string, newPromptId: string) => void;
}

export const pendingJobStorage = createDurableStorage(AsyncStorage);

export const usePendingJobsStore = create<PendingJobsState>()(
  persist(
    (set) => ({
      jobs: [],

      addJob: (job) =>
        set((state) => ({
          jobs: [
            ...state.jobs.filter((j) => j.serverId !== job.serverId || j.promptId !== job.promptId),
            {
              ...job,
              workflowSnapshot: job.workflowSnapshot ? JSON.parse(JSON.stringify(job.workflowSnapshot)) : undefined,
            },
          ],
        })),

      removeJob: (serverId, promptId) =>
        set((state) => ({
          jobs: state.jobs.filter((j) => j.serverId !== serverId || j.promptId !== promptId),
        })),

      replaceJobId: (serverId, oldPromptId, newPromptId) =>
        set((state) => ({
          jobs: !state.jobs.some((j) => j.serverId === serverId && j.promptId === oldPromptId)
            ? state.jobs
            : state.jobs
                .filter((j) => oldPromptId === newPromptId || j.serverId !== serverId || j.promptId !== newPromptId)
                .map((j) =>
                  j.serverId === serverId && j.promptId === oldPromptId ? { ...j, promptId: newPromptId } : j,
                ),
        })),
    }),
    {
      name: 'pending-jobs-storage',
      storage: createJSONStorage(() => pendingJobStorage),
    },
  ),
);

/** Read pending jobs outside of React. */
export function getPendingJobs(serverId?: string) {
  const { jobs } = usePendingJobsStore.getState();
  return serverId ? jobs.filter((j) => j.serverId === serverId) : jobs;
}
