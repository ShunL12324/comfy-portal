import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDebouncedCallback } from 'use-debounce';

import { useServersStore } from '@/features/server/stores/server-store';
import { useWorkflowStore } from '@/features/workflow/stores/workflow-store';
import { Node } from '@/features/workflow/types';
import { ComfyClient, GenerationAbortedError, QueueResponse } from '@/services/comfy-client';
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

/**
 * Module-level state that survives provider remounts.
 * Stores in-flight generation info so we can recover results
 * after navigating away and back.
 */
interface PendingGeneration {
  promptId: string;
  serverId: string;
  workflowId: string;
}
let pendingGenerations: PendingGeneration[] = [];

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

  // Disconnect WebSocket when provider unmounts (leaving run page).
  // Don't interrupt — the server generation continues and we recover via pendingGenerations.
  useEffect(() => {
    return () => {
      const client = comfyClient.current;
      if (client) {
        client.disconnect();
      }
      comfyClient.current = null;
    };
  }, []);

  // Recover generations that were in-flight when the user navigated away.
  // pendingGenerations is module-level so it survives provider remounts.
  useEffect(() => {
    if (pendingGenerations.length === 0) return;

    const toRecover = [...pendingGenerations];
    // Use the first entry's serverId to find the server (all should be same server)
    const server = useServersStore.getState().servers.find((s) => s.id === toRecover[0].serverId);
    if (!server) {
      pendingGenerations = [];
      return;
    }

    let cancelled = false;

    const recover = async () => {
      const client = new ComfyClient({
        host: server.host,
        port: server.port.toString(),
        useSSL: server.useSSL,
        token: server.token,
      });
      client.onQueueUpdate = (queueRemaining) => {
        setStatus((prev) => ({ ...prev, queueRemaining }));
      };
      comfyClient.current = client;

      try {
        await client.connect();
      } catch {
        pendingGenerations = [];
        return;
      }

      if (cancelled) {
        client.disconnect();
        return;
      }

      setStatus((prev) => ({ ...prev, status: 'generating' }));

      // Recover all pending prompts concurrently
      const recoverOne = async (pending: PendingGeneration) => {
        try {
          await client.recoverGeneration(pending.promptId, {
            onProgress: handleProgress,
            onNodeStart: (nodeId) => {
              setStatus((prev) => ({ ...prev, currentNodeId: nodeId }));
            },
            onNodeComplete: (nodeId, total, completed) => {
              handleNodeProgress(completed, total);
            },
            onDownloadProgress: (_, dlProgress) => {
              setStatus((prev) => {
                if (prev.status === 'downloading') return prev;
                return { ...prev, status: 'downloading' };
              });
              debouncedSetProgress({ downloadProgress: dlProgress });
            },
            onComplete: async (mediaUrls) => {
              useWorkflowStore.getState().updateUsage(pending.workflowId);
              if (mediaUrls.length > 0) {
                await saveAndSetMedia(mediaUrls, pending.serverId, pending.workflowId, {});
              }
            },
          });
        } catch (error) {
          if (!(error instanceof GenerationAbortedError)) {
            console.warn('Recovery failed for prompt:', pending.promptId, error);
          }
        } finally {
          // Remove this prompt from pending
          pendingGenerations = pendingGenerations.filter((p) => p.promptId !== pending.promptId);
        }
      };

      await Promise.all(toRecover.map(recoverOne));

      // All recovered — reset if no more pending
      if (pendingGenerations.length === 0) {
        reset();
      }
    };

    recover();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle app foreground/background transitions
  useEffect(() => {
    if (Platform.OS === 'web') return;

    const subscription = AppState.addEventListener('change', async (nextState) => {
      if (nextState !== 'active') return;
      const client = comfyClient.current;
      if (!client) return;

      // App returned to foreground — reconnect if needed
      if (!client.isConnected()) {
        try {
          await client.connect();
        } catch {
          // Reconnect failed — if generation was active, it'll hit timeout
          return;
        }
      }

      // If a generation is in-flight, check if it completed while we were away
      if (client.isGenerating()) {
        await client.recoverIfCompleted();
      }
    });

    return () => subscription.remove();
  }, []);

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
      // Don't debounce — node completions are infrequent and must not be
      // swallowed by the shared debouncedSetProgress used for sampler progress.
      setProgress((prev) => ({
        ...prev,
        nodeProgress: { completed, total },
      }));
    },
    [],
  );

  const reset = useCallback(() => {
    if (progressCompleteTimeoutRef.current) {
      clearTimeout(progressCompleteTimeoutRef.current);
      progressCompleteTimeoutRef.current = null;
    }
    // Cancel any pending debounced progress updates to prevent them
    // from overwriting the reset state after it's applied.
    debouncedSetProgress.cancel();
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
  }, [debouncedSetProgress]);

  const registerNodeHooks = useCallback((nodeId: string, hooks: NodeLifecycleHooks) => {
    nodeHooksRef.current[nodeId] = hooks;
  }, []);

  const unregisterNodeHooks = useCallback((nodeId: string) => {
    delete nodeHooksRef.current[nodeId];
  }, []);

  const cancel = useCallback(async () => {
    pendingGenerations = [];
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

  /** Save downloaded media to local storage and update preview. Shared by generate & recovery. */
  const saveAndSetMedia = useCallback(
    async (mediaUrls: string[], serverId: string, workflowId: string, workflow: Record<string, Node>) => {
      const savedPaths: string[] = [];
      for (const mediaUrl of mediaUrls) {
        const result = await saveGeneratedMedia({ serverId, mediaUrl, workflow, workflowId });
        if (result) {
          const localUrl = Platform.OS === 'web'
            ? result.path
            : result.path.startsWith('file://') ? result.path : `file://${result.path}`;
          savedPaths.push(localUrl);
        }
      }
      if (savedPaths.length > 0) {
        setGeneratedMedia(savedPaths);
      }
      return savedPaths;
    },
    [setGeneratedMedia],
  );

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
            if (!comfyClient.current.isGenerating()) reset();
            return;
          }
        }

        let currentPromptId: string | null = null;

        await comfyClient.current.generate(workflowForExecution, {
          onQueued: (promptId) => {
            currentPromptId = promptId;
            pendingGenerations.push({ promptId, serverId, workflowId });
          },
          onProgress: handleProgress,
          onNodeStart: (nodeId) => {
            setStatus((prev) => ({ ...prev, currentNodeId: nodeId }));
          },
          onNodeComplete: (nodeId, total, completed) => {
            handleNodeProgress(completed, total);
          },
          onDownloadProgress: (_, dlProgress) => {
            // Only show download progress if this is the last generation
            if (!comfyClient.current || !comfyClient.current.isGenerating()) {
              setStatus((prev) => {
                if (prev.status === 'downloading') return prev;
                return { ...prev, status: 'downloading' };
              });
              debouncedSetProgress({ downloadProgress: dlProgress });
            }
          },
          onComplete: async (mediaUrls) => {
            // isGenerating() checks trackedPrompts AFTER this prompt was already resolved,
            // so it reflects whether OTHER generations are still in-flight.
            const isLastGeneration = !comfyClient.current?.isGenerating();

            try {
              useWorkflowStore.getState().updateUsage(workflowId);

              if (mediaUrls.length > 0) {
                const saved = await saveAndSetMedia(mediaUrls, serverId, workflowId, workflowForExecution);
                if (saved.length === 0) {
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
              showToast.error(
                'Error',
                error instanceof Error ? error.message : 'An unexpected error occurred.',
                insets.top + 8,
              );
            } finally {
              // Remove this prompt from pending
              if (currentPromptId) {
                pendingGenerations = pendingGenerations.filter((p) => p.promptId !== currentPromptId);
              }
              // Only reset to idle if no more generations are tracked
              if (isLastGeneration) {
                // Cancel pending debounced updates before resetting to prevent
                // stale progress (e.g. downloadProgress: 100) from overwriting the reset.
                debouncedSetProgress.cancel();
                setStatus((prev) => ({
                  ...prev,
                  status: 'idle',
                  currentNodeId: undefined,
                }));
                lastProgressPercentRef.current = 0;
                setProgress({
                  progress: { value: 0, max: 0 },
                  nodeProgress: { completed: 0, total: 0 },
                  downloadProgress: 0,
                });
              }
            }
          },
        });
      } catch (error) {
        if (error instanceof GenerationAbortedError) {
          // Don't reset — other generations may still be in-flight
          return;
        }
        console.error('Generation error:', error);
        showToast.error(
          'Generation Failed',
          error instanceof Error ? error.message : 'An unexpected error occurred.',
          insets.top + 8,
        );
        if (!comfyClient.current?.isGenerating()) {
          pendingGenerations = [];
          reset();
        }
      }
    },
    [handleNodeProgress, handleProgress, insets.top, reset, debouncedSetProgress, setGeneratedMedia, saveAndSetMedia],
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
