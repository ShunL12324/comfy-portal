import { RotatingSpinner } from '@/components/ui/rotating-spinner';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { AgentChatMessage, ChatMessage, NodeChange } from '@/features/ai-assistant/types';
import { useAIAssistantStore } from '@/features/ai-assistant/stores/ai-assistant-store';
import { Agent } from '@/features/ai-assistant/agent';
import { ToolRegistry } from '@/features/ai-assistant/tools/registry';
import {
  createWorkflowTools,
  serializeWorkflowForPrompt,
} from '@/features/ai-assistant/tools/workflow-tools';
import { WorkflowHistory } from '@/features/ai-assistant/tools/workflow-history';
import { useWorkflowStore } from '@/features/workflow/stores/workflow-store';
import { AIService } from '@/services/ai-service';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { AlertTriangle, Bot, Settings } from 'lucide-react-native';
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Pressable, ScrollView } from 'react-native';
import { ChatInput } from './agent-chat/chat-input';
import { ChatMessageBubble } from './agent-chat/chat-message-bubble';

const BASE_SYSTEM_PROMPT = `You are an AI assistant integrated into a ComfyUI workflow app called Comfy Portal.

You help users adjust their image generation workflow parameters through natural conversation.

## Available Tools
- **update_node_input**: Update a single node parameter.
- **batch_update_nodes**: Update multiple parameters at once (preferred for multiple changes).
- **run_workflow**: Trigger image generation (equivalent to pressing the Generate button).
- **undo**: Revert the last change(s). Can be called multiple times.

## Guidelines
- The current workflow state is provided below. Use node IDs and input keys exactly as shown.
- Each parameter has a type annotation (int, float, string, boolean, toggle). Provide values matching the type.
- For prompt text (CLIPTextEncode nodes), write high-quality Stable Diffusion / Flux prompts.
- For numeric parameters (steps, cfg, denoise, etc.), use your knowledge of best practices.
- Use batch_update_nodes when changing multiple parameters to keep undo atomic.
- Be concise. After making changes, briefly summarize what you did.
- If the user's request is ambiguous, ask for clarification.
- Respond in the same language the user uses.

## Current Workflow State
\`\`\`
{WORKFLOW_CONTEXT}
\`\`\``;

export interface AIChatTabRef {
  clearChat: () => void;
  hasMessages: () => boolean;
}

interface AIChatTabProps {
  workflowId: string;
  serverId: string;
  onRunWorkflow: () => void;
  onOpenSettings: () => void;
}

export const AIChatTab = forwardRef<AIChatTabRef, AIChatTabProps>(
  ({ workflowId, serverId, onRunWorkflow, onOpenSettings }, ref) => {
    const [messages, setMessages] = useState<AgentChatMessage[]>([]);
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const { provider, isConfigured } = useAIAssistantStore();
    const configured = isConfigured();
    const scrollViewRef = useRef<ScrollView>(null);
    const updateNodeInput = useWorkflowStore((state) => state.updateNodeInput);
    const restoreWorkflowData = useWorkflowStore((state) => state.restoreWorkflowData);

    // Persistent history instance (survives re-renders, cleared on chat clear)
    const historyRef = useRef(new WorkflowHistory());

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
        restoreWorkflowData: (data) => {
          restoreWorkflowData(workflowId, data);
        },
        runWorkflow: () => {
          onRunWorkflow();
        },
        history: historyRef.current,
      });
      workflowTools.forEach((tool) => registry.register(tool));

      // System prompt builder — called fresh each agent.run() to include latest workflow state
      const buildSystemPrompt = () => {
        const wf = useWorkflowStore.getState().workflow.find((w) => w.id === workflowId);
        const workflowContext = wf?.data
          ? serializeWorkflowForPrompt(wf.data)
          : '(empty workflow)';
        return BASE_SYSTEM_PROMPT.replace('{WORKFLOW_CONTEXT}', workflowContext);
      };

      return new Agent(aiService, registry, buildSystemPrompt);
    }, [provider, workflowId, updateNodeInput, restoreWorkflowData, onRunWorkflow]);

    const handleClearChat = useCallback(() => {
      setMessages([]);
      setChatHistory([]);
      historyRef.current.clear();
    }, []);

    useImperativeHandle(ref, () => ({
      clearChat: handleClearChat,
      hasMessages: () => messages.length > 0,
    }));

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
          for (const call of result.executedToolCalls) {
            if (call.name === 'update_node_input') {
              changes.push({
                nodeId: call.args.node_id,
                nodeTitle: '',
                inputKey: call.args.input_key,
                oldValue: undefined,
                newValue: call.args.value,
              });
            } else if (call.name === 'batch_update_nodes' && Array.isArray(call.args.updates)) {
              for (const update of call.args.updates) {
                changes.push({
                  nodeId: update.node_id,
                  nodeTitle: '',
                  inputKey: update.input_key,
                  oldValue: undefined,
                  newValue: update.value,
                });
              }
            }
          }

          const assistantMessage: AgentChatMessage = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: result.content,
            changes: changes.length > 0 ? changes : undefined,
            changesApplied: changes.length > 0 ? true : undefined,
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
      [agent, chatHistory, provider?.temperature],
    );

    if (!configured) {
      return <NotConfiguredView onOpenSettings={onOpenSettings} />;
    }

    return (
      <View className="flex-1">
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
              />
            ))
          )}
          {isLoading && <TypingIndicator />}
        </BottomSheetScrollView>

        <ChatInput onSend={handleSend} disabled={isLoading} />
      </View>
    );
  },
);

AIChatTab.displayName = 'AIChatTab';

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
            className="mt-4 flex-row items-center gap-2 rounded-xl bg-typography-900 px-5 py-2.5 active:opacity-80"
          >
            <Icon as={Settings} size="sm" className="text-typography-0" />
            <Text className="text-sm font-semibold text-typography-0">Open Settings</Text>
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
