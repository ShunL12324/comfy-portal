import { AdaptiveScrollView } from '@/components/self-ui/adaptive-sheet-components';
import { RotatingSpinner } from '@/components/ui/rotating-spinner';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { createLanguageModel } from '@/features/ai-assistant/model';
import { useAIAssistantStore } from '@/features/ai-assistant/stores/ai-assistant-store';
import { useChatSessionStore } from '@/features/ai-assistant/stores/chat-session-store';
import {
  createWorkflowTools,
  serializeWorkflowIndex,
} from '@/features/ai-assistant/tools/workflow-tools';
import { WorkflowHistory } from '@/features/ai-assistant/tools/workflow-history';
import { useWorkflowStore } from '@/features/workflow/stores/workflow-store';
import { useChat } from '@ai-sdk/react';
import { APICallError, DirectChatTransport, ToolLoopAgent, isStepCount, type UIMessage } from 'ai';
import { AlertTriangle, Bot, Settings } from 'lucide-react-native';
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';
import { Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { ChatInput } from './agent-chat/chat-input';
import { ChatMessageBubble } from './agent-chat/chat-message-bubble';

const BASE_SYSTEM_PROMPT = `You are an AI assistant integrated into a ComfyUI workflow app called Comfy Portal.

You help users adjust their image generation workflow parameters through natural conversation.

## Available Tools
- **read_workflow**: Inspect nodes. Call with a node_id to get its full input values and its \`rev\`.
- **update_node_input**: Update a single node parameter. Requires that node's \`rev\`.
- **batch_update_nodes**: Update multiple parameters at once (preferred for multiple changes).
- **run_workflow**: Trigger image generation (equivalent to pressing the Generate button).
- **undo**: Revert the last change(s). Can be called multiple times.

## Editing Rules
- You MUST call read_workflow on a node before editing it — edits require the \`rev\` it returns.
- A successful edit returns a new \`rev\`; use it for further edits to that same node.
- If an edit is rejected because the rev is stale, the error includes the node's current state.
  Re-apply your change on top of that state — never re-send the old value.
- When modifying text (e.g. a prompt), preserve the existing content unless the user asked
  otherwise. Send the complete new value, not a fragment.

## Guidelines
- The node index below lists every node and its editable input names and types.
- Provide values matching each parameter's type (int, float, string, boolean, toggle).
- For prompt text (CLIPTextEncode nodes), write high-quality Stable Diffusion / Flux prompts.
- For numeric parameters (steps, cfg, denoise, etc.), use your knowledge of best practices.
- Use batch_update_nodes when changing multiple parameters to keep undo atomic.
- Be concise. After making changes, briefly summarize what you did.
- If the user's request is ambiguous, ask for clarification.
- Respond in the same language the user uses.`;

/** Stable fallback so the selector doesn't allocate on every render. */
const EMPTY_MESSAGES: UIMessage[] = [];

/**
 * Give up on a turn that stops producing anything.
 *
 * `DirectChatTransport` forwards only `messages` and `abortSignal` to the
 * agent, so the SDK's per-call `timeout` isn't reachable through this path.
 * An idle watchdog is a better fit anyway: it tolerates a legitimately long
 * answer and only fires when nothing has arrived for a while.
 */
const IDLE_TIMEOUT_MS = 90_000;

export interface AIChatTabRef {
  clearChat: () => void;
  hasMessages: () => boolean;
}

interface AIChatTabProps {
  workflowId: string;
  serverId: string;
  onRunWorkflow: () => void;
}

/**
 * True when the failure is about credentials or the model id — i.e. something
 * the user fixes in settings, as opposed to a transient network or server
 * problem. Uses the SDK's typed errors; the old string matching classified
 * rate limits and 5xx as "misconfigured".
 */
function isConfigError(error: unknown): boolean {
  if (APICallError.isInstance(error)) {
    const status = error.statusCode;
    return status === 401 || status === 403 || status === 404;
  }
  return false;
}

export const AIChatTab = forwardRef<AIChatTabRef, AIChatTabProps>(
  ({ workflowId, serverId, onRunWorkflow }, ref) => {
    const persistedMessages = useChatSessionStore(
      useCallback(
        (state): UIMessage[] =>
          state.sessions[`${serverId}:${workflowId}`]?.messages ?? EMPTY_MESSAGES,
        [serverId, workflowId],
      ),
    );
    const persistMessages = useChatSessionStore((state) => state.setMessages);
    const clearSession = useChatSessionStore((state) => state.clearSession);

    const { provider, isConfigured } = useAIAssistantStore();
    const configured = isConfigured();
    const scrollViewRef = useRef<ScrollView>(null);
    const updateNodeInput = useWorkflowStore((state) => state.updateNodeInput);
    const restoreWorkflowData = useWorkflowStore((state) => state.restoreWorkflowData);
    const router = useRouter();

    // Undo stack lives across renders; cleared with the chat.
    const historyRef = useRef(new WorkflowHistory());

    // `onRunWorkflow` changes identity on every workflow edit, so it's read
    // through a ref — otherwise the agent (and the whole chat) would be rebuilt
    // on every keystroke in any node input.
    const runWorkflowRef = useRef(onRunWorkflow);
    runWorkflowRef.current = onRunWorkflow;

    const agent = useMemo(() => {
      if (!provider) return null;

      const tools = createWorkflowTools({
        getWorkflowData: () =>
          useWorkflowStore.getState().workflow.find((w) => w.id === workflowId)?.data || {},
        updateNodeInput: (nodeId, inputKey, value) =>
          updateNodeInput(workflowId, nodeId, inputKey, value),
        restoreWorkflowData: (data) => restoreWorkflowData(workflowId, data),
        runWorkflow: () => runWorkflowRef.current(),
        history: historyRef.current,
      });

      return new ToolLoopAgent({
        model: createLanguageModel(provider),
        instructions: BASE_SYSTEM_PROMPT,
        tools,
        temperature: provider.temperature ?? 0.7,
        stopWhen: isStepCount(12),
        // `instructions` can only be a string, so the live node index is
        // injected per call — a snapshot captured at construction would go
        // stale as soon as the user or the agent changed anything.
        prepareCall: ({ options, ...settings }) => {
          const data =
            useWorkflowStore.getState().workflow.find((w) => w.id === workflowId)?.data;
          const index = data ? serializeWorkflowIndex(data) : '(empty workflow)';
          const custom = useAIAssistantStore.getState().customPrompt?.trim();
          return {
            ...settings,
            instructions: [
              BASE_SYSTEM_PROMPT,
              `\n## Workflow Nodes\n${index}`,
              custom ? `\n## User Instructions\n${custom}` : '',
            ]
              .filter(Boolean)
              .join('\n'),
          };
        },
      });
    }, [provider, workflowId, updateNodeInput, restoreWorkflowData]);

    const transport = useMemo(
      () => (agent ? new DirectChatTransport({ agent }) : undefined),
      [agent],
    );

    const { messages, status, error, sendMessage, stop, setMessages } = useChat({
      id: `${serverId}:${workflowId}`,
      transport,
      // The store persists plain JSON and is deliberately agnostic of the
      // agent's tool types, so it's re-typed at this boundary.
      messages: persistedMessages as never,
      onFinish: ({ messages: finalMessages }) => {
        persistMessages(serverId, workflowId, finalMessages as UIMessage[]);
      },
    });

    const isBusy = status === 'submitted' || status === 'streaming';

    // Watchdog: abort a turn that has gone quiet. Resets on every new chunk,
    // so a long but healthy response is never cut off.
    useEffect(() => {
      if (!isBusy) return;
      const timer = setTimeout(stop, IDLE_TIMEOUT_MS);
      return () => clearTimeout(timer);
    }, [isBusy, messages, stop]);

    const handleClearChat = useCallback(() => {
      clearSession(serverId, workflowId);
      setMessages([]);
      historyRef.current.clear();
    }, [clearSession, serverId, workflowId, setMessages]);

    useImperativeHandle(ref, () => ({
      clearChat: handleClearChat,
      hasMessages: () => messages.length > 0,
    }));

    // Auto-scroll as content streams in
    useEffect(() => {
      if (messages.length > 0) {
        const timer = setTimeout(() => {
          scrollViewRef.current?.scrollToEnd?.({ animated: true });
        }, 100);
        return () => clearTimeout(timer);
      }
    }, [messages, status]);

    const handleSend = useCallback(
      (text: string) => {
        if (!transport || isBusy) return;
        void sendMessage({ text });
      },
      [transport, isBusy, sendMessage],
    );

    if (!configured) {
      return <NotConfiguredView />;
    }

    return (
      <View className="flex-1">
        <AdaptiveScrollView
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
            messages.map((message) => <ChatMessageBubble key={message.id} message={message} />)
          )}
          {status === 'submitted' && <TypingIndicator />}
          {error && (
            <ErrorNotice
              error={error}
              onOpenSettings={
                isConfigError(error) ? () => router.push('/settings/ai-assistant') : undefined
              }
            />
          )}
        </AdaptiveScrollView>

        <ChatInput onSend={handleSend} isBusy={isBusy} onStop={stop} />
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

function NotConfiguredView() {
  const router = useRouter();
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
            onPress={() => router.push('/settings/ai-assistant')}
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

function ErrorNotice({
  error,
  onOpenSettings,
}: {
  error: Error;
  onOpenSettings?: () => void;
}) {
  return (
    <View className="mb-3 rounded-2xl bg-error-50 px-4 py-3">
      <Text className="text-sm text-error-700">{error.message}</Text>
      {onOpenSettings && (
        <Pressable
          onPress={onOpenSettings}
          className="mt-2 flex-row items-center gap-1.5 self-start rounded-lg bg-warning-100 px-3 py-2 active:opacity-80"
        >
          <Icon as={Settings} size="xs" className="text-warning-700" />
          <Text className="text-xs font-semibold text-warning-700">Check AI Configuration</Text>
        </Pressable>
      )}
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
