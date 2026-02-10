import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { Colors } from '@/constants/Colors';
import { AgentChatMessage, NodeChange } from '@/features/ai-assistant/types';
import { useResolvedTheme } from '@/store/theme';
import { ArrowRight, Bot, Check, User } from 'lucide-react-native';
import { MotiView } from 'moti';
import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import Markdown from 'react-native-markdown-display';

interface ChatMessageBubbleProps {
  message: AgentChatMessage;
}

export function ChatMessageBubble({ message }: ChatMessageBubbleProps) {
  const isUser = message.role === 'user';
  const hasChanges = message.changes && message.changes.length > 0;
  const theme = useResolvedTheme();

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
        {/* Message bubble */}
        {isUser ? (
          <View className="rounded-2xl rounded-br-md bg-typography-900 px-3.5 py-2.5">
            <Text className="text-sm leading-5 text-typography-0">
              {message.content}
            </Text>
          </View>
        ) : (
          <View className="rounded-2xl rounded-bl-md bg-background-100 px-3.5 py-2.5">
            <Markdown style={mdStyles} mergeStyle={false}>
              {message.content}
            </Markdown>
          </View>
        )}

        {/* Changes card — informational, changes are auto-applied by tools */}
        {hasChanges && (
          <View className="mt-2 w-full rounded-xl border border-outline-50 bg-background-50 p-3">
            <View className="mb-2 flex-row items-center gap-1.5">
              <Icon as={Check} size="2xs" className="text-success-600" />
              <Text className="text-xs font-semibold uppercase tracking-wide text-typography-500">
                Applied Changes
              </Text>
            </View>
            {message.changes!.map((change, index) => (
              <ChangeItem key={`${change.nodeId}-${change.inputKey}-${index}`} change={change} />
            ))}
          </View>
        )}
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

function ChangeItem({ change }: { change: NodeChange }) {
  const formatValue = (val: any): string => {
    if (val === undefined || val === null) return '—';
    if (typeof val === 'string') {
      return val.length > 40 ? `${val.substring(0, 40)}...` : val;
    }
    return String(val);
  };

  return (
    <View className="mb-1.5 rounded-lg bg-background-0 px-2.5 py-2">
      <Text className="text-xs text-typography-500" numberOfLines={1}>
        {change.nodeTitle ? `${change.nodeTitle} · ` : ''}{change.inputKey}
      </Text>
      <View className="mt-1 flex-row items-center gap-1.5">
        {change.oldValue !== undefined && (
          <>
            <Text className="flex-1 text-xs text-typography-400" numberOfLines={1}>
              {formatValue(change.oldValue)}
            </Text>
            <Icon as={ArrowRight} size="2xs" className="text-typography-300" />
          </>
        )}
        <Text className="flex-1 text-xs font-medium text-typography-900" numberOfLines={1}>
          {formatValue(change.newValue)}
        </Text>
      </View>
    </View>
  );
}
