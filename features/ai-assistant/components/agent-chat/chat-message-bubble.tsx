import { Icon } from '@/components/ui/icon';
import { RotatingSpinner } from '@/components/ui/rotating-spinner';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { Colors } from '@/constants/Colors';
import { useResolvedTheme } from '@/store/theme';
import {
  getToolName,
  isToolUIPart,
  type DynamicToolUIPart,
  type ToolUIPart,
  type UIMessage,
} from 'ai';
import { AlertCircle, Bot, Check, User, Wrench } from 'lucide-react-native';
import { MotiView } from 'moti';
import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import Markdown from 'react-native-markdown-display';

interface ChatMessageBubbleProps {
  message: UIMessage;
  renderFooter?: React.ReactNode;
}

export function ChatMessageBubble({ message, renderFooter }: ChatMessageBubbleProps) {
  const isUser = message.role === 'user';
  const theme = useResolvedTheme();

  // StyleSheet.create required by react-native-markdown-display API — cannot use NativeWind here
  const mdStyles = useMemo(
    () =>
      StyleSheet.create({
        body: {
          color: theme === 'dark' ? Colors.dark.typography[900] : Colors.light.typography[900],
          fontSize: 14,
          lineHeight: 20,
        },
        heading1: {
          fontSize: 20,
          fontWeight: 'bold',
          marginTop: 8,
          marginBottom: 4,
          color: theme === 'dark' ? Colors.dark.typography[900] : Colors.light.typography[900],
        },
        heading2: {
          fontSize: 18,
          fontWeight: 'bold',
          marginTop: 6,
          marginBottom: 4,
          color: theme === 'dark' ? Colors.dark.typography[900] : Colors.light.typography[900],
        },
        heading3: {
          fontSize: 16,
          fontWeight: '600',
          marginTop: 4,
          marginBottom: 2,
          color: theme === 'dark' ? Colors.dark.typography[900] : Colors.light.typography[900],
        },
        heading4: {
          fontSize: 14,
          fontWeight: '600',
          color: theme === 'dark' ? Colors.dark.typography[900] : Colors.light.typography[900],
        },
        heading5: {
          fontSize: 13,
          fontWeight: '600',
          color: theme === 'dark' ? Colors.dark.typography[900] : Colors.light.typography[900],
        },
        heading6: {
          fontSize: 12,
          fontWeight: '600',
          color: theme === 'dark' ? Colors.dark.typography[900] : Colors.light.typography[900],
        },
        paragraph: {
          marginTop: 0,
          marginBottom: 6,
        },
        strong: {
          fontWeight: 'bold',
        },
        em: {
          fontStyle: 'italic',
        },
        s: {
          textDecorationLine: 'line-through',
        },
        link: {
          color: theme === 'dark' ? Colors.dark.primary[400] : Colors.light.primary[500],
          textDecorationLine: 'underline',
        },
        blockquote: {
          backgroundColor: theme === 'dark' ? Colors.dark.background[50] : Colors.light.background[50],
          borderColor: theme === 'dark' ? Colors.dark.outline[100] : Colors.light.outline[100],
          borderLeftWidth: 3,
          paddingHorizontal: 8,
          paddingVertical: 4,
          marginVertical: 4,
        },
        code_inline: {
          backgroundColor: theme === 'dark' ? Colors.dark.background[50] : Colors.light.background[50],
          borderColor: theme === 'dark' ? Colors.dark.outline[50] : Colors.light.outline[100],
          borderWidth: 1,
          borderRadius: 4,
          paddingHorizontal: 4,
          paddingVertical: 1,
          fontSize: 12,
          fontFamily: 'Menlo',
          color: theme === 'dark' ? Colors.dark.typography[900] : Colors.light.typography[900],
        },
        code_block: {
          backgroundColor: theme === 'dark' ? Colors.dark.background[50] : Colors.light.background[50],
          borderColor: theme === 'dark' ? Colors.dark.outline[50] : Colors.light.outline[100],
          borderWidth: 1,
          borderRadius: 6,
          padding: 8,
          fontSize: 12,
          fontFamily: 'Menlo',
          color: theme === 'dark' ? Colors.dark.typography[900] : Colors.light.typography[900],
        },
        fence: {
          backgroundColor: theme === 'dark' ? Colors.dark.background[50] : Colors.light.background[50],
          borderColor: theme === 'dark' ? Colors.dark.outline[50] : Colors.light.outline[100],
          borderWidth: 1,
          borderRadius: 6,
          padding: 8,
          fontSize: 12,
          fontFamily: 'Menlo',
          color: theme === 'dark' ? Colors.dark.typography[900] : Colors.light.typography[900],
        },
        bullet_list: {
          marginVertical: 2,
        },
        ordered_list: {
          marginVertical: 2,
        },
        list_item: {
          flexDirection: 'row',
          justifyContent: 'flex-start',
          marginVertical: 1,
        },
        bullet_list_icon: {
          marginLeft: 4,
          marginRight: 6,
          color: theme === 'dark' ? Colors.dark.typography[500] : Colors.light.typography[500],
        },
        bullet_list_content: {
          flex: 1,
        },
        ordered_list_icon: {
          marginLeft: 4,
          marginRight: 6,
          color: theme === 'dark' ? Colors.dark.typography[500] : Colors.light.typography[500],
        },
        ordered_list_content: {
          flex: 1,
        },
        hr: {
          backgroundColor: theme === 'dark' ? Colors.dark.outline[100] : Colors.light.outline[100],
          height: 1,
          marginVertical: 8,
        },
        table: {
          borderWidth: 1,
          borderColor: theme === 'dark' ? Colors.dark.outline[100] : Colors.light.outline[100],
          borderRadius: 4,
          marginVertical: 4,
        },
        tr: {
          borderBottomWidth: 1,
          borderColor: theme === 'dark' ? Colors.dark.outline[50] : Colors.light.outline[50],
          flexDirection: 'row',
        },
        th: {
          flex: 1,
          padding: 4,
          fontWeight: 'bold',
          fontSize: 12,
        },
        td: {
          flex: 1,
          padding: 4,
          fontSize: 12,
        },
        image: {
          flex: 1,
          borderRadius: 6,
        },
        text: {},
        textgroup: {},
      }),
    [theme],
  );

  return (
    <MotiView
      from={{ opacity: 0, translateY: 6 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 200 }}
      className={`mb-3 flex-row ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      {/* Avatar for assistant */}
      {!isUser && (
        <View className="mr-2 mt-1 h-7 w-7 items-center justify-center rounded-full bg-primary-100">
          <Icon as={Bot} size="xs" className="text-primary-600" />
        </View>
      )}

      <View className={`max-w-[85%] ${isUser ? 'items-end' : 'items-start'}`}>
        {/*
          A message is an ordered list of parts — text interleaved with tool
          activity — so they're rendered in sequence rather than as a single
          body plus a summary card.
        */}
        {message.parts.map((part, index) => {
          if (part.type === 'text') {
            if (!part.text) return null;
            return isUser ? (
              <View
                key={index}
                className="rounded-2xl rounded-br-md bg-typography-900 px-3.5 py-2.5"
              >
                <Text className="text-sm leading-5 text-typography-0">{part.text}</Text>
              </View>
            ) : (
              <View
                key={index}
                className="w-full rounded-2xl rounded-bl-md bg-background-100 px-3.5 py-2.5"
              >
                <Markdown style={mdStyles} mergeStyle={false}>
                  {part.text}
                </Markdown>
              </View>
            );
          }

          if (isToolUIPart(part)) {
            return <ToolPartCard key={index} part={part} />;
          }

          return null;
        })}

        {/* Optional footer (e.g. config error action) */}
        {renderFooter}
      </View>

      {/* Avatar for user */}
      {isUser && (
        <View className="ml-2 mt-1 h-7 w-7 items-center justify-center rounded-full bg-background-200">
          <Icon as={User} size="xs" className="text-typography-600" />
        </View>
      )}
    </MotiView>
  );
}

/** Human-readable labels for the agent's tools. */
const TOOL_LABELS: Record<string, string> = {
  read_workflow: 'Reading workflow',
  update_node_input: 'Updating parameter',
  batch_update_nodes: 'Updating parameters',
  run_workflow: 'Generating',
  undo: 'Undoing',
};

/**
 * One tool invocation, rendered per lifecycle state.
 *
 * Replaces the old "Applied Changes" summary, which was built by re-parsing
 * tool arguments after the fact and could never show a before value.
 */
function ToolPartCard({ part }: { part: ToolUIPart | DynamicToolUIPart }) {
  // Our agent only registers static tools, but the type guard also admits
  // dynamic ones, which carry their name on a different field.
  const name = part.type === 'dynamic-tool' ? part.toolName : getToolName(part);
  const label = TOOL_LABELS[name] ?? name;

  const pending = part.state === 'input-streaming' || part.state === 'input-available';
  const failed = part.state === 'output-error';

  return (
    <View
      className={`mt-2 w-full rounded-xl border px-3 py-2.5 ${
        failed ? 'border-error-200 bg-error-50' : 'border-outline-50 bg-background-50'
      }`}
    >
      <View className="flex-row items-center gap-1.5">
        {pending ? (
          <RotatingSpinner size="sm" />
        ) : (
          <Icon
            as={failed ? AlertCircle : Check}
            size="2xs"
            className={failed ? 'text-error-600' : 'text-success-600'}
          />
        )}
        <Text
          className={`text-xs font-semibold uppercase tracking-wide ${
            failed ? 'text-error-700' : 'text-typography-500'
          }`}
        >
          {label}
        </Text>
      </View>

      {part.state === 'output-error' && (
        <Text className="mt-1.5 text-xs text-error-700">{part.errorText}</Text>
      )}

      {part.state === 'output-available' && typeof part.output === 'string' && (
        <Text className="mt-1.5 text-xs text-typography-600" numberOfLines={6}>
          {part.output}
        </Text>
      )}
    </View>
  );
}
