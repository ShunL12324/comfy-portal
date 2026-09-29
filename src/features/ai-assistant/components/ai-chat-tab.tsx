import { AdaptiveScrollView } from '@/components/self-ui/adaptive-sheet-components';
import { Action, Copy, Row, StateIcon, useDesign } from '@/components/ui/design-system/primitives';
import { RotatingSpinner } from '@/components/ui/rotating-spinner';
import { View } from '@/components/ui/view';
import { designTokens as t } from '@/constants/design-tokens';
import { createLanguageModel } from '@/features/ai-assistant/model';
import { useAIAssistantStore } from '@/features/ai-assistant/stores/ai-assistant-store';
import { useChatSessionStore } from '@/features/ai-assistant/stores/chat-session-store';
import { WorkflowHistory } from '@/features/ai-assistant/tools/workflow-history';
import { createWorkflowTools, serializeWorkflowIndex } from '@/features/ai-assistant/tools/workflow-tools';
import { useWorkflowStore } from '@/features/workflow/stores/workflow-store';
import { useChat } from '@ai-sdk/react';
import { APICallError, DirectChatTransport, ToolLoopAgent, isStepCount, type UIMessage } from 'ai';
import { useRouter } from 'expo-router';
import { Bot, Settings } from '@/constants/icons';
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { ScrollView } from 'react-native';
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
  onConversationStateChange?: (state: { hasMessages: boolean; isBusy: boolean }) => void;
  onComposerChange?: (composer: ReactNode) => void;
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
  ({ workflowId, serverId, onRunWorkflow, onConversationStateChange, onComposerChange }, ref) => {
    const persistedMessages = useChatSessionStore(
      useCallback(
        (state): UIMessage[] => state.sessions[`${serverId}:${workflowId}`]?.messages ?? EMPTY_MESSAGES,
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
    const c = useDesign();
    const [providerConfigError, setProviderConfigError] = useState(false);

    // Undo stack lives across renders; cleared with the chat.
    const [history] = useState(() => new WorkflowHistory());

    // `onRunWorkflow` changes identity on every workflow edit, so it's read
    // through a ref — otherwise the agent (and the whole chat) would be rebuilt
    // on every keystroke in any node input.
    const runWorkflowRef = useRef(onRunWorkflow);
    useEffect(() => {
      runWorkflowRef.current = onRunWorkflow;
    }, [onRunWorkflow]);

    const agent = useMemo(() => {
      if (!provider) return null;

      // Tool registration stores callbacks; only execute() reads the ref during a request.
      // eslint-disable-next-line react-hooks/refs
      const tools = createWorkflowTools({
        getWorkflowData: () => useWorkflowStore.getState().workflow.find((w) => w.id === workflowId)?.data || {},
        updateNodeInput: (nodeId, inputKey, value) => updateNodeInput(workflowId, nodeId, inputKey, value),
        restoreWorkflowData: (data) => restoreWorkflowData(workflowId, data),
        runWorkflow: () => runWorkflowRef.current(),
        history,
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
          const data = useWorkflowStore.getState().workflow.find((w) => w.id === workflowId)?.data;
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
    }, [provider, workflowId, updateNodeInput, restoreWorkflowData, history]);

    const transport = useMemo(
      () =>
        agent
          ? new DirectChatTransport({
              agent,
              // The local transport serializes errors before useChat receives
              // them. Classify the original error here and expose useful copy
              // without echoing provider responses or request credentials.
              onError: (cause) => {
                setProviderConfigError(isConfigError(cause));
                if (APICallError.isInstance(cause)) {
                  if (cause.statusCode === 401 || cause.statusCode === 403)
                    return 'The provider rejected your credentials. Check configuration.';
                  if (cause.statusCode === 404) return 'The model or endpoint was not found. Check configuration.';
                  if (cause.statusCode === 429) return 'The provider is busy or out of quota. Try again later.';
                }
                return 'Could not complete the response. Try again.';
              },
            })
          : undefined,
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
    useEffect(() => {
      onConversationStateChange?.({ hasMessages: configured && messages.length > 0, isBusy });
    }, [configured, isBusy, messages.length, onConversationStateChange]);

    // Watchdog: abort a turn that has gone quiet. Resets on every new chunk,
    // so a long but healthy response is never cut off.
    useEffect(() => {
      if (!isBusy) return;
      const timer = setTimeout(stop, IDLE_TIMEOUT_MS);
      return () => clearTimeout(timer);
    }, [isBusy, messages, stop]);

    const handleClearChat = useCallback(() => {
      setProviderConfigError(false);
      clearSession(serverId, workflowId);
      setMessages([]);
      history.clear();
    }, [clearSession, serverId, workflowId, setMessages, history]);

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
        setProviderConfigError(false);
        void sendMessage({ text });
      },
      [transport, isBusy, sendMessage],
    );

    const composer = useMemo(
      () => (configured ? <ChatInput onSend={handleSend} isBusy={isBusy} onStop={stop} /> : null),
      [configured, handleSend, isBusy, stop],
    );
    useEffect(() => {
      onComposerChange?.(composer);
      return () => onComposerChange?.(null);
    }, [composer, onComposerChange]);

    if (!configured) {
      return (
        <View testID="run-agent-chat" style={{ flex: 1, backgroundColor: c.workspace }}>
          <NotConfiguredView />
        </View>
      );
    }

    return (
      <View testID="run-agent-chat" style={{ flex: 1, backgroundColor: c.workspace }}>
        <AdaptiveScrollView
          ref={scrollViewRef as any}
          testID="agent-chat-messages"
          style={{ flex: 1 }}
          keyboardShouldPersistTaps="handled"
          enableFooterMarginAdjustment={!!onComposerChange}
          contentContainerStyle={{
            paddingHorizontal: t.layout.inset,
            paddingTop: t.layout.inset,
            paddingBottom: t.layout.related,
            gap: t.layout.inset,
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
                providerConfigError || isConfigError(error) ? () => router.navigate('/settings/ai-assistant') : undefined
              }
            />
          )}
        </AdaptiveScrollView>

        {!onComposerChange && composer}
      </View>
    );
  },
);

AIChatTab.displayName = 'AIChatTab';

function EmptyStateView() {
  return (
    <View style={{ gap: t.layout.related }}>
      <Row style={{ gap: t.layout.label }}>
        <StateIcon icon={Bot} size={t.icon.small} />
        <Copy style={{ fontWeight: '500' }}>Workflow assistant</Copy>
      </Row>
      <Copy size="label" muted>
        Adjust prompts, change parameters, or inspect this workflow through a conversation.
      </Copy>
    </View>
  );
}
function NotConfiguredView() {
  const router = useRouter();
  return (
    <View style={{ padding: t.layout.inset, gap: t.layout.related }}>
      <Copy style={{ fontWeight: '500' }}>Connect an AI provider</Copy>
      <Copy size="label" muted>
        Choose a provider and model to let the assistant help edit this workflow.
      </Copy>
      <Row>
        <Action kind="secondary" small icon={Settings} onPress={() => router.navigate('/settings/ai-assistant')}>
          Open settings
        </Action>
      </Row>
    </View>
  );
}
function ErrorNotice({ error, onOpenSettings }: { error: Error; onOpenSettings?: () => void }) {
  const c = useDesign();
  return (
    <View
      accessibilityRole="alert"
      style={{
        backgroundColor: c.well,
        borderRadius: t.radius.panel,
        borderWidth: 1,
        borderColor: c.line,
        padding: t.layout.rowX,
        gap: t.layout.related,
      }}
    >
      <Copy size="label" style={{ color: c.danger }}>
        {error.message}
      </Copy>
      {onOpenSettings && (
        <Row>
          <Action kind="text" small icon={Settings} onPress={onOpenSettings}>
            Check configuration
          </Action>
        </Row>
      )}
    </View>
  );
}
function TypingIndicator() {
  return (
    <Row style={{ paddingVertical: t.layout.label, gap: t.layout.related }}>
      <RotatingSpinner size="sm" />
      <Copy muted size="label">
        Thinking…
      </Copy>
    </Row>
  );
}
