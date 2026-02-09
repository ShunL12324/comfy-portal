import { Icon } from '@/components/ui/icon';
import { Colors } from '@/constants/Colors';
import { useResolvedTheme } from '@/store/theme';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { Send } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

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
    <View style={styles.container}>
      <View
        style={[
          styles.inputRow,
          {
            backgroundColor: isDark ? Colors.dark.background[50] : Colors.light.background[50],
            borderColor: isDark ? Colors.dark.outline[50] : Colors.light.outline[50],
          },
        ]}
      >
        <BottomSheetTextInput
          style={[
            styles.input,
            {
              color: isDark ? Colors.dark.typography[900] : Colors.light.typography[900],
            },
          ]}
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
          style={[
            styles.sendButton,
            {
              backgroundColor: canSend
                ? Colors[isDark ? 'dark' : 'light'].typography[900]
                : isDark
                  ? Colors.dark.background[200]
                  : Colors.light.background[200],
            },
          ]}
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

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: 20,
    borderWidth: 1,
    paddingLeft: 14,
    paddingRight: 4,
    paddingVertical: 4,
    minHeight: 44,
  },
  input: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    maxHeight: 100,
    paddingVertical: 8,
    paddingRight: 8,
  },
  sendButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 1,
  },
});
