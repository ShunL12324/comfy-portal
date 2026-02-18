import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDebouncedCallback } from 'use-debounce';

import { useServersStore } from '@/features/server/stores/server-store';
import { useWorkflowStore } from '@/features/workflow/stores/workflow-store';
import { Node } from '@/features/workflow/types';
import { ComfyClient, QueueResponse } from '@/services/comfy-client';
import { saveGeneratedMedia } from '@/services/image-storage';
import { showToast } from '@/utils/toast';

interface GenerationState {
  status: 'idle' | 'generating' | 'downloading' | 'error' | 'success';
  progress: { value: number; max: number };
  nodeProgress: { completed: number; total: number };
  downloadProgress: number;
  generatedMedia: string[];
  currentNodeId?: string;
}

interface NodeLifecycleHooks {
  onPre?: () => void | Promise<void>;
  onPost?: () => void | Promise<void>;
}

interface GenerationContextType {
  state: GenerationState;
  generatedMedia: string[];
  isGenerating: boolean;
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

const GenerationContext = createContext<GenerationContextType | null>(null);

interface GenerationStatus {
  status: 'idle' | 'generating' | 'downloading' | 'error' | 'success';
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
const GenerationActionsContext = createContext<Omit<GenerationContextType, 'state' | 'generatedMedia' | 'isGenerating'> | null>(null);

export function GenerationProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<GenerationStatus>({
    status: 'idle',
    generatedMedia: [],
    queueRemaining: 0,
  });

  const [progress, setProgress] = useState<GenerationProgress>({
    progress: { value: 0, max: 0 },
    nodeProgress: { completed: 0, total: 0 },
    downloadProgress: 0,
  });

  const comfyClient = useRef<ComfyClient | null>(null);
  const progressCompleteTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const nodeHooksRef = useRef<Record<string, NodeLifecycleHooks>>({});
  const insets = useSafeAreaInsets();

  const lastProgressPercentRef = useRef(0);

  // Debounce progress updates to avoid excessive re-renders
  const debouncedSetProgress = useDebouncedCallback(
    (updates: Partial<GenerationProgress>) => {
      setProgress((prev) => ({
        ...prev,
        ...updates,
      }));
    },
    100,
    { maxWait: 200 },
  );

  const handleProgress = useCallback(
    (value: number, max: number) => {
      const percent = (value / max) * 100;
      if (
        value === 1 || // Start
        value === max || // End
        Math.abs(percent - lastProgressPercentRef.current) >= 5 // Change >= 5%
      ) {
        lastProgressPercentRef.current = percent;
        debouncedSetProgress({
          progress: { value, max },
        });
      }
    },
    [debouncedSetProgress],
  );

  const handleNodeProgress = useCallback(
    (completed: number, total: number) => {
      debouncedSetProgress({
        nodeProgress: { completed, total },
      });
    },
    [debouncedSetProgress],
  );

  const reset = useCallback(() => {
    if (progressCompleteTimeoutRef.current) {
      clearTimeout(progressCompleteTimeoutRef.current);
      progressCompleteTimeoutRef.current = null;
    }
    setStatus((prev) => ({
      ...prev,
      status: 'idle',
      currentNodeId: undefined,
      // Note: queueRemaining is NOT reset here — it's managed by the persistent WebSocket listener
    }));
    lastProgressPercentRef.current = 0;
    setProgress({
      progress: { value: 0, max: 0 },
      nodeProgress: { completed: 0, total: 0 },
      downloadProgress: 0,
    });
  }, []);

  const registerNodeHooks = useCallback((nodeId: string, hooks: NodeLifecycleHooks) => {
    nodeHooksRef.current[nodeId] = hooks;
  }, []);

  const unregisterNodeHooks = useCallback((nodeId: string) => {
    delete nodeHooksRef.current[nodeId];
  }, []);

  const cancel = useCallback(async () => {
    if (!comfyClient.current) return;
    try {
      await comfyClient.current.interrupt();
    } catch (error) {
      console.error('Failed to interrupt:', error);
    }
    reset();
  }, [reset]);

  const getQueue = useCallback(async (): Promise<QueueResponse> => {
    if (!comfyClient.current) return { queue_running: [], queue_pending: [] };
    return comfyClient.current.getQueue();
  }, []);

  const deleteQueueItems = useCallback(async (promptIds: string[]) => {
    if (!comfyClient.current) return;
    await comfyClient.current.deleteQueueItems(promptIds);
  }, []);

  const clearQueue = useCallback(async () => {
    if (!comfyClient.current) return;
    await comfyClient.current.clearQueue();
  }, []);

  const setGeneratedMedia = useCallback((urls: string[]) => {
    setStatus((prev) => ({ ...prev, generatedMedia: urls }));
  }, []);

  const generate = useCallback(
    async (workflow: Record<string, Node>, workflowId: string, serverId: string) => {
      const server = useServersStore.getState().servers.find((s) => s.id === serverId);
      if (!server) {
        showToast.error('Error', 'Server not found', insets.top + 8);
        return;
      }

      if (!comfyClient.current) {
        comfyClient.current = new ComfyClient({
          host: server.host,
          port: server.port.toString(),
          useSSL: server.useSSL,
          token: server.token,
        });
        comfyClient.current.onQueueUpdate = (queueRemaining) => {
          setStatus((prev) => ({ ...prev, queueRemaining }));
        };
      }

      try {
        reset();
        setStatus((prev) => ({ ...prev, status: 'generating' }));

        // Call onPre hooks for all nodes
        await Promise.all(
          Object.entries(workflow).map(async ([nodeId, _]) => {
            const hooks = nodeHooksRef.current[nodeId];
            if (hooks?.onPre) {
              await hooks.onPre();
            }
          }),
        );

        // onPre hooks may update node inputs in the workflow store (e.g. random seeds).
        // Re-read the latest workflow snapshot so this generation run uses those updates.
        const workflowForExecution =
          useWorkflowStore.getState().workflow.find((p) => p.id === workflowId)?.data ?? workflow;

        if (!comfyClient.current.isConnected()) {
          try {
            await comfyClient.current.connect();
          } catch (error) {
            console.error('Failed to connect to server:', error);
            showToast.error(
              'Connection Failed',
              'Unable to connect to server. Please check your server status.',
              insets.top + 8,
            );
            reset();
            return;
          }
        }

        await comfyClient.current.generate(workflowForExecution, {
          onProgress: handleProgress,
          onNodeStart: (nodeId) => {
            setStatus((prev) => ({ ...prev, currentNodeId: nodeId }));
          },
          onNodeComplete: (node, completed, total) => {
            handleNodeProgress(completed, total);
          },
          onDownloadProgress: (_, progress) => {
            setStatus((prev) => {
              if (prev.status === 'downloading') return prev;
              return { ...prev, status: 'downloading' };
            });
            debouncedSetProgress({ downloadProgress: progress });
          },
          onComplete: async (mediaUrls) => {
            try {
              useWorkflowStore.getState().updateUsage(workflowId);

              if (mediaUrls.length > 0) {
                debouncedSetProgress({
                  progress: { value: progress.progress.max, max: progress.progress.max },
                });

                await new Promise((resolve) => setTimeout(resolve, 300));

                const savedMediaPaths: string[] = [];
                for (const mediaUrl of mediaUrls) {
                  const result = await saveGeneratedMedia({
                    serverId,
                    mediaUrl,
                    workflow: workflowForExecution,
                    workflowId,
                  });

                  if (result) {
                    // On web, paths are already HTTP URLs; on native, ensure file:// prefix
                    const localMediaUrl = Platform.OS === 'web'
                      ? result.path
                      : result.path.startsWith('file://') ? result.path : `file://${result.path}`;
                    savedMediaPaths.push(localMediaUrl);
                  }
                }

                if (savedMediaPaths.length > 0) {
                  setGeneratedMedia(savedMediaPaths);
                } else {
                  console.error('Failed to save generated media');
                  showToast.error('Save Failed', 'Unable to save the generated media.', insets.top + 8);
                }
              } else {
                showToast.error('Generation Failed', 'No media were generated.', insets.top + 8);
              }

              // Call onPost hooks for all nodes
              await Promise.all(
                Object.entries(workflowForExecution).map(async ([nodeId, _]) => {
                  const hooks = nodeHooksRef.current[nodeId];
                  if (hooks?.onPost) {
                    await hooks.onPost();
                  }
                }),
              );
            } catch (error) {
              console.error('Error in generation completion:', error);
              showToast.error(
                'Error',
                error instanceof Error ? error.message : 'An unexpected error occurred.',
                insets.top + 8,
              );
            } finally {
              reset();
            }
          },
        });
      } catch (error) {
        console.error('Generation error:', error);
        showToast.error(
          'Generation Failed',
          error instanceof Error ? error.message : 'An unexpected error occurred.',
          insets.top + 8,
        );
        reset();
      }
    },
    [handleNodeProgress, handleProgress, insets.top, reset, debouncedSetProgress, progress.progress.max, setGeneratedMedia],
  );

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
          <GenerationContext.Provider
            value={{
              state: { ...status, ...progress },
              generatedMedia: status.generatedMedia,
              isGenerating: status.status === 'generating',
              ...actions,
            }}
          >
            {children}
          </GenerationContext.Provider>
        </GenerationProgressContext.Provider>
      </GenerationStatusContext.Provider>
    </GenerationActionsContext.Provider>
  );
}

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

export function useGenerationState() {
  const status = useGenerationStatus();
  const progress = useGenerationProgress();
  return { ...status, ...progress };
}

export function useGenerationActions() {
  const context = useContext(GenerationActionsContext);
  if (!context) {
    throw new Error('useGenerationActions must be used within a GenerationProvider');
  }
  return context;
}

export function useGeneration() {
  const context = useContext(GenerationContext);
  if (!context) {
    throw new Error('useGeneration must be used within a GenerationProvider');
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
