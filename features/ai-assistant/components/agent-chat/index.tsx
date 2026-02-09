import { RotatingSpinner } from '@/components/ui/rotating-spinner';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { ThemedBottomSheetModal } from '@/components/self-ui/themed-bottom-sheet-modal';
import { AgentChatMessage, ChatMessage, NodeChange } from '@/features/ai-assistant/types';
import { useAIAssistantStore } from '@/features/ai-assistant/stores/ai-assistant-store';
import { Agent } from '@/features/ai-assistant/agent';
import { ToolRegistry } from '@/features/ai-assistant/tools/registry';
import { createWorkflowTools } from '@/features/ai-assistant/tools/workflow-tools';
import { useWorkflowStore } from '@/features/workflow/stores/workflow-store';
import { AIService } from '@/services/ai-service';
import { BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useRouter } from 'expo-router';
import { AlertTriangle, Bot, Settings, Trash2 } from 'lucide-react-native';
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Keyboard, Pressable, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChatInput } from './chat-input';
import { ChatMessageBubble } from './chat-message-bubble';

const SYSTEM_PROMPT = `You are an AI assistant integrated into a ComfyUI workflow app called Comfy Portal.

You can view and modify the user's workflow parameters using the tools provided.

Guidelines:
- When the user asks to change workflow parameters, ALWAYS call get_workflow_state first to see the current state.
- Use update_node_input or batch_update_nodes to make changes.
- For prompt text (CLIPTextEncode nodes), write high-quality Stable Diffusion / Flux prompts.
- For numeric parameters (steps, cfg, denoise, etc.), use your knowledge of best practices.
- Be concise in your responses. After making changes, briefly summarize what you did.
- If the user's request is ambiguous, ask for clarification.
- Respond in the same language the user uses.`;

export interface AgentChatSheetRef {
  present: () => void;
  dismiss: () => void;
}

interface AgentChatSheetProps {
  workflowId: string;
  serverId: string;
  onApplyChanges: (changes: NodeChange[]) => void;
  onUndoChanges: (changes: NodeChange[]) => void;
}

export const AgentChatSheet = forwardRef<AgentChatSheetRef, AgentChatSheetProps>(
  ({ workflowId, serverId, onApplyChanges, onUndoChanges }, ref) => {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const bottomSheetRef = useRef<BottomSheetModal>(null);

    const [messages, setMessages] = useState<AgentChatMessage[]>([]);
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const { provider, isConfigured } = useAIAssistantStore();
    const configured = isConfigured();
    const scrollViewRef = useRef<ScrollView>(null);
    const updateNodeInput = useWorkflowStore((state) => state.updateNodeInput);

    // Build the agent with tools
    const agent = useMemo(() => {
      if (!provider) return null;

      const aiService = new AIService({
        endpointUrl: provider.endpointUrl,
        apiKey: provider.apiKey,
        modelName: provider.modelName,
      });

      const registry = new ToolRegistry();
      const workflowTools = createWorkflowTools({
        getWorkflowData: () => {
          const wf = useWorkflowStore.getState().workflow.find((w) => w.id === workflowId);
          return wf?.data || {};
        },
        updateNodeInput: (nodeId, inputKey, value) => {
          updateNodeInput(workflowId, nodeId, inputKey, value);
        },
      });
      workflowTools.forEach((tool) => registry.register(tool));

      return new Agent(aiService, registry, SYSTEM_PROMPT);
    }, [provider, workflowId, updateNodeInput]);

    useImperativeHandle(ref, () => ({
      present: () => bottomSheetRef.current?.present(),
      dismiss: () => bottomSheetRef.current?.dismiss(),
    }));

    // Keyboard workaround for bottom sheet
    useEffect(() => {
      const sub = Keyboard.addListener('keyboardWillHide', () => {
        bottomSheetRef.current?.snapToIndex(0);
      });
      return () => sub.remove();
    }, []);

    // Auto-scroll to bottom when messages change
    useEffect(() => {
      if (messages.length > 0) {
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd?.({ animated: true });
        }, 100);
      }
    }, [messages, isLoading]);

    const handleSend = useCallback(
      async (text: string) => {
        if (!agent) return;

        const userMessage: AgentChatMessage = {
          id: Date.now().toString(),
          role: 'user',
          content: text,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, userMessage]);
        setIsLoading(true);

        try {
          const result = await agent.run(
            chatHistory,
            text,
            provider?.temperature ?? 0.7,
          );

          // Build NodeChange objects from executed tool calls
          const changes: NodeChange[] = [];
          const workflowData = useWorkflowStore.getState().workflow.find((w) => w.id === workflowId)?.data || {};

          for (const call of result.executedToolCalls) {
            if (call.name === 'update_node_input') {
              const node = workflowData[call.args.node_id];
              if (node) {
                changes.push({
                  nodeId: call.args.node_id,
                  nodeTitle: node._meta?.title || node.class_type || 'Unknown',
                  inputKey: call.args.input_key,
                  oldValue: node.inputs[call.args.input_key],
                  newValue: call.args.value,
                });
              }
            } else if (call.name === 'batch_update_nodes' && Array.isArray(call.args.updates)) {
              for (const update of call.args.updates) {
                const node = workflowData[update.node_id];
                if (node) {
                  changes.push({
                    nodeId: update.node_id,
                    nodeTitle: node._meta?.title || node.class_type || 'Unknown',
                    inputKey: update.input_key,
                    oldValue: node.inputs[update.input_key],
                    newValue: update.value,
                  });
                }
              }
            }
          }

          const assistantMessage: AgentChatMessage = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: result.content,
            changes: changes.length > 0 ? changes : undefined,
            changesApplied: changes.length > 0 ? true : undefined, // Already applied by tools
            timestamp: Date.now(),
          };
          setMessages((prev) => [...prev, assistantMessage]);

          // Update conversation history
          setChatHistory((prev) => [
            ...prev,
            { role: 'user', content: text },
            { role: 'assistant', content: result.content },
          ]);
        } catch (error) {
          const errorMessage: AgentChatMessage = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: `Error: ${error instanceof Error ? error.message : 'Failed to get response'}`,
            timestamp: Date.now(),
          };
          setMessages((prev) => [...prev, errorMessage]);
        } finally {
          setIsLoading(false);
        }
      },
      [agent, chatHistory, provider?.temperature, workflowId],
    );

    const handleApplyChanges = useCallback(
      (changes: NodeChange[]) => {
        onApplyChanges(changes);
        // Mark message as applied
        setMessages((prev) =>
          prev.map((msg) =>
            msg.changes === changes ? { ...msg, changesApplied: true } : msg,
          ),
        );
      },
      [onApplyChanges],
    );

    const handleUndoChanges = useCallback(
      (changes: NodeChange[]) => {
        onUndoChanges(changes);
        setMessages((prev) =>
          prev.map((msg) =>
            msg.changes === changes ? { ...msg, changesApplied: false } : msg,
          ),
        );
      },
      [onUndoChanges],
    );

    const handleClearChat = useCallback(() => {
      setMessages([]);
      setChatHistory([]);
    }, []);

    const handleOpenSettings = useCallback(() => {
      bottomSheetRef.current?.dismiss();
      router.push('/settings/ai-assistant');
    }, [router]);

    return (
      <ThemedBottomSheetModal
        ref={bottomSheetRef}
        index={0}
        snapPoints={['100%']}
        enableDynamicSizing={false}
        topInset={insets.top}
        enablePanDownToClose
        keyboardBehavior="extend"
        keyboardBlurBehavior="restore"
      >
        <View className="flex-1">
          {/* Header */}
          <View className="flex-row items-center justify-between border-b border-outline-50 px-4 pb-3">
            <View className="flex-row items-center gap-2">
              <View className="h-8 w-8 items-center justify-center rounded-full bg-primary-100">
                <Icon as={Bot} size="sm" className="text-primary-600" />
              </View>
              <View>
                <Text className="text-sm font-semibold text-typography-900">AI Agent</Text>
                <Text className="text-xs text-typography-500">Workflow Assistant</Text>
              </View>
            </View>
            <View className="flex-row items-center gap-1">
              {messages.length > 0 && (
                <Pressable onPress={handleClearChat} className="rounded-lg p-2 active:bg-background-100">
                  <Icon as={Trash2} size="sm" className="text-typography-400" />
                </Pressable>
              )}
              <Pressable onPress={handleOpenSettings} className="rounded-lg p-2 active:bg-background-100">
                <Icon as={Settings} size="sm" className="text-typography-400" />
              </Pressable>
            </View>
          </View>

          {/* Content */}
          {!configured ? (
            <NotConfiguredView onOpenSettings={handleOpenSettings} />
          ) : (
            <>
              <BottomSheetScrollView
                ref={scrollViewRef as any}
                style={{ flex: 1 }}
                contentContainerStyle={{
                  padding: 16,
                  paddingBottom: 8,
                  flexGrow: 1,
                }}
              >
                {messages.length === 0 ? (
                  <EmptyStateView />
                ) : (
                  messages.map((msg) => (
                    <ChatMessageBubble
                      key={msg.id}
                      message={msg}
                      onApplyChanges={handleApplyChanges}
                      onUndoChanges={handleUndoChanges}
                    />
                  ))
                )}
                {isLoading && <TypingIndicator />}
              </BottomSheetScrollView>

              <ChatInput onSend={handleSend} disabled={isLoading} />
              <View style={{ height: insets.bottom }} />
            </>
          )}
        </View>
      </ThemedBottomSheetModal>
    );
  },
);

AgentChatSheet.displayName = 'AgentChatSheet';

function EmptyStateView() {
  return (
    <View className="flex-1 items-center justify-center py-12">
      <View className="mb-3 h-12 w-12 items-center justify-center rounded-full bg-primary-50">
        <Icon as={Bot} size="lg" className="text-primary-400" />
      </View>
      <Text className="text-center text-sm font-medium text-typography-700">
        How can I help?
      </Text>
      <Text className="mt-1 text-center text-xs text-typography-400">
        Ask me to adjust prompts, tweak parameters,{'\n'}or optimize your workflow.
      </Text>
    </View>
  );
}

function NotConfiguredView({ onOpenSettings }: { onOpenSettings: () => void }) {
  return (
    <View className="flex-1 items-center justify-center px-6 py-12">
      <View className="w-full rounded-2xl bg-warning-50 px-5 py-6">
        <View className="items-center">
          <View className="mb-3 rounded-full bg-warning-100 p-2">
            <Icon as={AlertTriangle} size="md" className="text-warning-600" />
          </View>
          <Text className="text-center text-base font-semibold text-typography-900">
            AI Not Configured
          </Text>
          <Text className="mt-1 text-center text-sm text-typography-600">
            Set up your API provider to use the AI Agent.
          </Text>
          <Pressable
            onPress={onOpenSettings}
            className="mt-4 flex-row items-center gap-2 rounded-xl bg-primary-500 px-5 py-2.5 active:bg-primary-600"
          >
            <Icon as={Settings} size="sm" className="text-white" />
            <Text className="text-sm font-semibold text-white">Open Settings</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function TypingIndicator() {
  return (
    <View className="mb-3 flex-row items-center gap-2">
      <View className="h-7 w-7 items-center justify-center rounded-full bg-primary-100">
        <Icon as={Bot} size="xs" className="text-primary-600" />
      </View>
      <View className="flex-row items-center gap-2 rounded-2xl rounded-bl-md bg-background-100 px-4 py-3">
        <RotatingSpinner size="sm" />
        <Text className="text-xs text-typography-500">Thinking...</Text>
      </View>
    </View>
  );
}
