import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { AgentChatMessage, NodeChange } from '@/features/ai-assistant/types';
import { ArrowRight, Bot, Check, User } from 'lucide-react-native';
import { MotiView } from 'moti';
import React from 'react';

interface ChatMessageBubbleProps {
  message: AgentChatMessage;
}

export function ChatMessageBubble({ message }: ChatMessageBubbleProps) {
  const isUser = message.role === 'user';
  const hasChanges = message.changes && message.changes.length > 0;

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
        <View
          className={`rounded-2xl px-3.5 py-2.5 ${
            isUser
              ? 'rounded-br-md bg-typography-900'
              : 'rounded-bl-md bg-background-100'
          }`}
        >
          <Text
            className={`text-sm leading-5 ${
              isUser ? 'text-typography-0' : 'text-typography-900'
            }`}
          >
            {message.content}
          </Text>
        </View>

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
        <Text className={`flex-1 text-xs font-medium text-typography-900`} numberOfLines={1}>
          {formatValue(change.newValue)}
        </Text>
      </View>
    </View>
  );
}
