import { Icon } from '@/components/ui/icon';
import { AdaptiveTextInput } from '@/components/self-ui/adaptive-sheet-components';
import { Colors } from '@/constants/Colors';
import { useResolvedTheme } from '@/store/theme';
import { Send } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({ onSend, disabled = false, placeholder = 'Ask AI to adjust parameters...' }: ChatInputProps) {
  const [text, setText] = useState('');
  const theme = useResolvedTheme();
  const isDark = theme === 'dark';

  const canSend = text.trim().length > 0 && !disabled;

  const handleSend = useCallback(() => {
    if (!canSend) return;
    onSend(text.trim());
    setText('');
  }, [text, canSend, onSend]);

  return (
    <View className="px-4 py-2">
      <View
        className="flex-row items-end rounded-[20px] border border-outline-50 bg-background-50 pl-3.5 pr-1 py-1 min-h-[44px]"
      >
        {/* Style prop required — className not supported by BottomSheetTextInput (used internally via AdaptiveTextInput) */}
        <AdaptiveTextInput
          style={{
            flex: 1,
            fontSize: 14,
            lineHeight: 20,
            maxHeight: 100,
            paddingVertical: 8,
            paddingRight: 8,
            color: isDark ? Colors.dark.typography[900] : Colors.light.typography[900],
          }}
          placeholder={placeholder}
          placeholderTextColor={isDark ? Colors.dark.typography[400] : Colors.light.typography[400]}
          value={text}
          onChangeText={setText}
          onSubmitEditing={handleSend}
          multiline
          maxLength={2000}
          editable={!disabled}
          blurOnSubmit={false}
        />
        <Pressable
          onPress={handleSend}
          disabled={!canSend}
          className={`w-[34px] h-[34px] rounded-full items-center justify-center mb-px ${
            canSend ? 'bg-typography-900' : 'bg-background-200'
          }`}
        >
          <Icon
            as={Send}
            size="xs"
            className={canSend ? 'text-typography-0' : 'text-typography-400'}
          />
        </Pressable>
      </View>
    </View>
  );
}
