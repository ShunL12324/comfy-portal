import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDebouncedCallback } from 'use-debounce';

import { useServersStore } from '@/store/servers';
import { useWorkflowStore } from '@/store/workflow';
import { Node } from '@/types/workflow';
import { ComfyClient } from '@/utils/comfy-client';
import { saveGeneratedImage } from '@/utils/image-storage';
import { showToast } from '@/utils/toast';

interface GenerationState {
  status: 'idle' | 'generating' | 'downloading';
  progress: { value: number; max: number };
  nodeProgress: { completed: number; total: number };
  downloadProgress: number;
  currentNodeId?: string;
}

interface NodeLifecycleHooks {
  onPre?: () => void | Promise<void>;
  onPost?: () => void | Promise<void>;
}

interface GenerationContextType {
  state: GenerationState;
  generatedImage: string | null;
  isGenerating: boolean;
  generate: (workflow: Record<string, Node>, workflowId: string, serverId: string) => Promise<void>;
  reset: () => void;
  setGeneratedImage: (url: string | null) => void;
  registerNodeHooks: (nodeId: string, hooks: NodeLifecycleHooks) => void;
  unregisterNodeHooks: (nodeId: string) => void;
}

const GenerationContext = createContext<GenerationContextType | null>(null);

export function GenerationProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<GenerationState>({
    status: 'idle',
    progress: { value: 0, max: 0 },
    nodeProgress: { completed: 0, total: 0 },
    downloadProgress: 0,
  });
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const comfyClient = useRef<ComfyClient | null>(null);
  const progressCompleteTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const nodeHooksRef = useRef<Record<string, NodeLifecycleHooks>>({});
  const insets = useSafeAreaInsets();

  const debouncedSetState = useDebouncedCallback(
    (updates: Partial<GenerationState>) => {
      setState((prev) => ({
        ...prev,
        ...updates,
      }));
    },
    100,
    { maxWait: 200 },
  );

  const handleProgress = useCallback(
    (value: number, max: number) => {
      debouncedSetState({
        progress: { value, max },
      });
    },
    [debouncedSetState],
  );

  const handleNodeProgress = useCallback(
    (completed: number, total: number) => {
      debouncedSetState({
        nodeProgress: { completed, total },
      });
    },
    [debouncedSetState],
  );

  const reset = useCallback(() => {
    if (progressCompleteTimeoutRef.current) {
      clearTimeout(progressCompleteTimeoutRef.current);
      progressCompleteTimeoutRef.current = null;
    }
    setState({
      status: 'idle',
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
        });
      }

      try {
        reset();
        setState((prev) => ({ ...prev, status: 'generating' }));

        // Call onPre hooks for all nodes
        await Promise.all(
          Object.entries(workflow).map(async ([nodeId, _]) => {
            const hooks = nodeHooksRef.current[nodeId];
            if (hooks?.onPre) {
              await hooks.onPre();
            }
          }),
        );

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

        await comfyClient.current.generate(workflow, {
          onProgress: handleProgress,
          onNodeStart: (nodeId) => {
            setState((prev) => ({ ...prev, currentNodeId: nodeId }));
          },
          onNodeComplete: (node, completed, total) => {
            handleNodeProgress(completed, total);
          },
          onDownloadProgress: (_, progress) => {
            if (progress === 0) {
              setState((prev) => ({
                ...prev,
                status: 'downloading',
                downloadProgress: 0,
              }));
            } else {
              setState((prev) => ({
                ...prev,
                downloadProgress: progress,
              }));
            }
          },
          onComplete: async (images) => {
            try {
              useWorkflowStore.getState().updateUsage(workflowId);

              if (images.length > 0) {
                setState((prev) => ({
                  ...prev,
                  progress: { ...prev.progress, value: prev.progress.max },
                }));

                await new Promise((resolve) => setTimeout(resolve, 300));

                const result = await saveGeneratedImage({
                  serverId,
                  imageUrl: images[0],
                  workflow,
                  workflowId,
                });

                if (result) {
                  const localImageUrl = result.path.startsWith('file://') ? result.path : `file://${result.path}`;
                  setGeneratedImage(localImageUrl);
                } else {
                  console.error('Failed to save generated image');
                  showToast.error('Save Failed', 'Unable to save the generated image.', insets.top + 8);
                }
              } else {
                showToast.error('Generation Failed', 'No images were generated.', insets.top + 8);
              }

              // Call onPost hooks for all nodes
              await Promise.all(
                Object.entries(workflow).map(async ([nodeId, _]) => {
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
          onError: (error) => {
            console.error('Generation error:', error);
            showToast.error('Generation Failed', error || 'An unexpected error occurred.', insets.top + 8);
            reset();
          },
        });
      } catch (error) {
        console.error('Unexpected error during generation:', error);
        showToast.error(
          'Error',
          error instanceof Error ? error.message : 'An unexpected error occurred during generation.',
          insets.top + 8,
        );
        reset();
      }
    },
    [handleNodeProgress, handleProgress, insets.top, reset],
  );

  return (
    <GenerationContext.Provider
      value={{
        state,
        generatedImage,
        isGenerating: state.status === 'generating',
        generate,
        reset,
        setGeneratedImage,
        registerNodeHooks,
        unregisterNodeHooks,
      }}
    >
      {children}
    </GenerationContext.Provider>
  );
}

export function useGeneration() {
  const context = useContext(GenerationContext);
  if (!context) {
    throw new Error('useGeneration must be used within a GenerationProvider');
  }
  return context;
}

export function useGenerationNodeState(nodeId: string) {
  const { state } = useGeneration();
  return {
    isCurrentNode: state.currentNodeId === nodeId,
    isGenerating: state.status === 'generating',
  };
}
