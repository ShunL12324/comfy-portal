import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useServersStore } from '@/features/server/stores/server-store';
import { useWorkflowStore } from '@/features/workflow/stores/workflow-store';
import { Node } from '@/features/workflow/types';
import { GenerationAbortedError, PromptRejectedError, QueueResponse } from '@/services/comfy-client';
import { showToast } from '@/utils/toast';
import { generateUUID } from '@/utils/uuid';

import { usePendingJobsStore } from '../stores/pending-jobs-store';
import {
  finalizeJob,
  getClient,
  getExistingClient,
  reconcileAll,
} from '../services/job-recovery';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type GenerationPhase = 'idle' | 'generating' | 'downloading';

interface NodeLifecycleHooks {
  onPre?: () => void | Promise<void>;
  onPost?: () => void | Promise<void>;
}

interface GenerationActions {
  generate: (workflow: Record<string, Node>, workflowId: string, serverId: string) => Promise<void>;
  reset: () => void;
  cancel: () => Promise<void>;
  getQueue: () => Promise<QueueResponse>;
  deleteQueueItems: (promptIds: string[]) => Promise<void>;
  clearQueue: () => Promise<void>;
  setGeneratedMedia: (urls: string[]) => void;
  registerNodeHooks: (nodeId: string, hooks: NodeLifecycleHooks) => void;
  unregisterNodeHooks: (nodeId: string) => void;
}

// ---------------------------------------------------------------------------
// Contexts (split for render performance)
// ---------------------------------------------------------------------------

interface GenerationStatus {
  status: GenerationPhase;
  currentNodeId?: string;
  generatedMedia: string[];
  queueRemaining: number;
}

interface GenerationProgress {
  progress: { value: number; max: number };
  nodeProgress: { completed: number; total: number };
  downloadProgress: number;
}

const GenerationStatusContext = createContext<GenerationStatus | null>(null);
const GenerationProgressContext = createContext<GenerationProgress | null>(null);
const GenerationActionsContext = createContext<GenerationActions | null>(null);

const INITIAL_PROGRESS: GenerationProgress = {
  progress: { value: 0, max: 0 },
  nodeProgress: { completed: 0, total: 0 },
  downloadProgress: 0,
};

// Minimum percentage change to trigger a sampler progress re-render
const PROGRESS_THRESHOLD_PERCENT = 5;

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function GenerationProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<GenerationStatus>({
    status: 'idle',
    generatedMedia: [],
    queueRemaining: 0,
  });
  const [progress, setProgress] = useState<GenerationProgress>(INITIAL_PROGRESS);

  const nodeHooksRef = useRef<Record<string, NodeLifecycleHooks>>({});
  const insets = useSafeAreaInsets();
  const lastProgressPercentRef = useRef(0);

  // Server this screen last generated against, for the queue-control actions.
  const lastServerIdRef = useRef<string | null>(null);
  // Concurrent generate() calls. Counted rather than derived from the client's
  // tracked prompts, because a run that is still in its onPre hooks isn't
  // tracked yet and would otherwise be reset to idle by a sibling finishing.
  const inFlightRef = useRef(0);

  // ---------------------------------------------------------------------------
  // Status-guarded setters
  //
  // These only apply updates when the generation is in the expected phase.
  // Native bridge callbacks (download progress, WS events) can arrive after
  // reset(); guarding at the setter level is the correct place to drop them
  // because it uses the actual current state, not a captured ref.
  // ---------------------------------------------------------------------------

  const setGeneratingStatus = useCallback(
    (updater: (prev: GenerationStatus) => Partial<GenerationStatus>) => {
      setStatus((prev) => {
        if (prev.status !== 'generating') return prev;
        return { ...prev, ...updater(prev) };
      });
    },
    [],
  );

  // statusRef mirrors the latest status.status for use inside setProgress updater.
  // We can't read React state from inside another setState updater, so we keep a ref.
  const statusRef = useRef<GenerationPhase>('idle');

  const setActiveProgress = useCallback(
    (updater: (prev: GenerationProgress) => Partial<GenerationProgress>) => {
      setProgress((prev) => {
        if (statusRef.current === 'idle') return prev;
        return { ...prev, ...updater(prev) };
      });
    },
    [],
  );

  // ---------------------------------------------------------------------------
  // Progress handlers
  // ---------------------------------------------------------------------------

  const handleProgress = useCallback(
    (value: number, max: number) => {
      const percent = (value / max) * 100;
      if (
        value === 1 ||
        value === max ||
        Math.abs(percent - lastProgressPercentRef.current) >= PROGRESS_THRESHOLD_PERCENT
      ) {
        lastProgressPercentRef.current = percent;
        setActiveProgress(() => ({ progress: { value, max } }));
      }
    },
    [setActiveProgress],
  );

  const handleNodeProgress = useCallback(
    (completed: number, total: number) => {
      setActiveProgress(() => ({ nodeProgress: { completed, total } }));
    },
    [setActiveProgress],
  );

  // ---------------------------------------------------------------------------
  // Reset
  // ---------------------------------------------------------------------------

  const reset = useCallback(() => {
    statusRef.current = 'idle';
    lastProgressPercentRef.current = 0;
    setStatus((prev) => ({
      ...prev,
      status: 'idle',
      currentNodeId: undefined,
    }));
    setProgress(INITIAL_PROGRESS);
  }, []);

  // ---------------------------------------------------------------------------
  // Node hooks
  // ---------------------------------------------------------------------------

  const registerNodeHooks = useCallback((nodeId: string, hooks: NodeLifecycleHooks) => {
    nodeHooksRef.current[nodeId] = hooks;
  }, []);

  const unregisterNodeHooks = useCallback((nodeId: string) => {
    delete nodeHooksRef.current[nodeId];
  }, []);

  // ---------------------------------------------------------------------------
  // Queue operations
  // ---------------------------------------------------------------------------

  /** Client for the server this screen is generating against, if any. */
  const currentClient = useCallback(() => {
    return lastServerIdRef.current ? getExistingClient(lastServerIdRef.current) : undefined;
  }, []);

  const cancel = useCallback(async () => {
    const client = currentClient();
    if (!client) return;
    try {
      await client.interrupt();
    } catch (error) {
      console.error('Failed to interrupt:', error);
    }
    reset();
    // Retire the interrupted job from the pending registry rather than leaving
    // it for the next foreground pass.
    void reconcileAll();
  }, [reset, currentClient]);

  const getQueue = useCallback(async (): Promise<QueueResponse> => {
    const client = currentClient();
    if (!client) return { queue_running: [], queue_pending: [] };
    return client.getQueue();
  }, [currentClient]);

  const deleteQueueItems = useCallback(async (promptIds: string[]) => {
    await currentClient()?.deleteQueueItems(promptIds);
  }, [currentClient]);

  const clearQueue = useCallback(async () => {
    await currentClient()?.clearQueue();
  }, [currentClient]);

  // ---------------------------------------------------------------------------
  // Media
  // ---------------------------------------------------------------------------

  const setGeneratedMedia = useCallback((urls: string[]) => {
    setStatus((prev) => ({ ...prev, generatedMedia: urls }));
  }, []);


  // ---------------------------------------------------------------------------
  // Client management
  // ---------------------------------------------------------------------------
  //
  // Clients live in the job-recovery registry, not here. Tying them to this
  // provider meant navigating away from the run screen disconnected mid-flight
  // generations and their results never reached the gallery.

  const attachClient = useCallback((serverId: string) => {
    const server = useServersStore.getState().servers.find((s) => s.id === serverId);
    if (!server) return undefined;
    const client = getClient(server);
    client.onQueueUpdate = (queueRemaining) => {
      setStatus((prev) => ({ ...prev, queueRemaining }));
    };
    lastServerIdRef.current = serverId;
    return client;
  }, []);

  // Catch up on anything that finished while this screen wasn't mounted, and
  // release our queue-update closure so the module-level client doesn't retain
  // a dead provider's setState.
  useEffect(() => {
    void reconcileAll();
    return () => {
      const client = lastServerIdRef.current
        ? getExistingClient(lastServerIdRef.current)
        : undefined;
      if (client) client.onQueueUpdate = undefined;
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Generate
  // ---------------------------------------------------------------------------

  const generate = useCallback(
    async (workflow: Record<string, Node>, workflowId: string, serverId: string) => {
      const client = attachClient(serverId);
      if (!client) {
        showToast.error('Error', 'Server not found', insets.top + 8);
        return;
      }

      // Chosen up front so the job can be recorded before the request goes
      // out — a lost response must not orphan a running generation.
      const localPromptId = generateUUID();
      let promptId = localPromptId;

      inFlightRef.current += 1;
      try {
        // Reset progress from any previous run
        lastProgressPercentRef.current = 0;
        setProgress(INITIAL_PROGRESS);
        statusRef.current = 'generating';
        setStatus((prev) => ({ ...prev, status: 'generating', currentNodeId: undefined }));

        // Call onPre hooks
        await Promise.all(
          Object.entries(workflow).map(async ([nodeId]) => {
            const hooks = nodeHooksRef.current[nodeId];
            if (hooks?.onPre) await hooks.onPre();
          }),
        );

        // Re-read workflow after onPre hooks (e.g. random seeds)
        const workflowForExecution =
          useWorkflowStore.getState().workflow.find((p) => p.id === workflowId)?.data ?? workflow;

        if (!client.isConnected()) {
          // Best-effort: the socket only carries live progress. If it can't be
          // established (proxy that won't upgrade /ws, flaky network) the
          // prompt still queues over HTTP and reconciliation delivers the
          // results — better than refusing to generate at all.
          await client.connect().catch(() => {});
        }

        usePendingJobsStore.getState().addJob({
          promptId: localPromptId,
          serverId,
          workflowId,
          queuedAt: Date.now(),
        });

        try {
          promptId = await client.queuePrompt(workflowForExecution, localPromptId);
        } catch (error) {
          // Only a explicit refusal proves nothing was queued. A transport
          // error may have been delivered anyway, so keep that job pending and
          // let reconciliation find out.
          if (error instanceof PromptRejectedError) {
            usePendingJobsStore.getState().removeJob(localPromptId);
          }
          throw error;
        }
        // Older servers ignore the requested id and assign their own.
        if (promptId !== localPromptId) {
          usePendingJobsStore.getState().replaceJobId(localPromptId, promptId);
        }

        // A server-reported failure still has to go through finalize: nodes
        // that completed before the error wrote real outputs.
        let executionError: unknown;
        try {
          await client.awaitCompletion(promptId, workflowForExecution, {
            onProgress: handleProgress,
            onNodeStart: (nodeId) => {
              setGeneratingStatus(() => ({ currentNodeId: nodeId }));
            },
            onNodeComplete: (_nodeId, total, completed) => {
              handleNodeProgress(completed, total);
            },
          });
        } catch (error) {
          // An abort means we stopped listening, not that the run stopped —
          // hand the job to reconciliation rather than chasing it here.
          if (error instanceof GenerationAbortedError) throw error;
          executionError = error;
        }

        useWorkflowStore.getState().updateUsage(workflowId);

        const savedPaths = await finalizeJob(
          { promptId, serverId, workflowId, queuedAt: Date.now() },
          {
            workflow: workflowForExecution,
            onDownloadProgress: (_, dlProgress) => {
              if (statusRef.current === 'idle') return;
              if (statusRef.current !== 'downloading') {
                statusRef.current = 'downloading';
                setStatus((prev) => ({ ...prev, status: 'downloading' }));
              }
              setActiveProgress(() => ({ downloadProgress: dlProgress }));
            },
          },
        );

        if (savedPaths && savedPaths.length > 0) {
          setGeneratedMedia(savedPaths);
        }
        if (executionError) throw executionError;
        // null means the run isn't committed yet or another pass owns it —
        // reconciliation will finish the job, so don't report failure.
        if (savedPaths && savedPaths.length === 0) {
          showToast.error('Generation Failed', 'No media were generated.', insets.top + 8);
        }

        // Call onPost hooks
        await Promise.all(
          Object.entries(workflowForExecution).map(async ([nodeId]) => {
            const hooks = nodeHooksRef.current[nodeId];
            if (hooks?.onPost) await hooks.onPost();
          }),
        );
      } catch (error) {
        if (!(error instanceof GenerationAbortedError)) {
          console.error('Generation error:', error);
          showToast.error(
            'Generation Failed',
            error instanceof Error ? error.message : 'An unexpected error occurred.',
            insets.top + 8,
          );
        }
        // Aborts (dropped socket, interrupt) and download failures leave the
        // job in the registry on purpose — reconciliation can still recover
        // the outputs, or retire it once the server's verdict is known.
      } finally {
        // Other generations may still be running — resetting on the first one
        // to finish would blank the UI while they continue.
        inFlightRef.current -= 1;
        if (inFlightRef.current <= 0) {
          inFlightRef.current = 0;
          reset();
        }
      }
    },
    [
      handleNodeProgress,
      handleProgress,
      insets.top,
      reset,
      attachClient,
      setGeneratedMedia,
      setGeneratingStatus,
      setActiveProgress,
    ],
  );

  // ---------------------------------------------------------------------------
  // Context values
  // ---------------------------------------------------------------------------

  const actions = React.useMemo(
    () => ({
      generate,
      reset,
      cancel,
      getQueue,
      deleteQueueItems,
      clearQueue,
      setGeneratedMedia,
      registerNodeHooks,
      unregisterNodeHooks,
    }),
    [generate, reset, cancel, getQueue, deleteQueueItems, clearQueue, registerNodeHooks, unregisterNodeHooks, setGeneratedMedia],
  );

  return (
    <GenerationActionsContext.Provider value={actions}>
      <GenerationStatusContext.Provider value={status}>
        <GenerationProgressContext.Provider value={progress}>
          {children}
        </GenerationProgressContext.Provider>
      </GenerationStatusContext.Provider>
    </GenerationActionsContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

export function useGenerationStatus() {
  const context = useContext(GenerationStatusContext);
  if (!context) {
    throw new Error('useGenerationStatus must be used within a GenerationProvider');
  }
  return context;
}

export function useGenerationProgress() {
  const context = useContext(GenerationProgressContext);
  if (!context) {
    throw new Error('useGenerationProgress must be used within a GenerationProvider');
  }
  return context;
}

export function useGenerationActions() {
  const context = useContext(GenerationActionsContext);
  if (!context) {
    throw new Error('useGenerationActions must be used within a GenerationProvider');
  }
  return context;
}

export function useGenerationNodeState(nodeId: string) {
  const status = useGenerationStatus();
  return {
    isCurrentNode: status.currentNodeId === nodeId,
    isGenerating: status.status === 'generating',
  };
}
