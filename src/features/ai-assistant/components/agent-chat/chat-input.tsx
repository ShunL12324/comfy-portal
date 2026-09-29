import { AdaptiveTextInput } from '@/components/self-ui/adaptive-sheet-components';
import { Action, useDesign } from '@/components/ui/design-system/primitives';
import { designTokens as t } from '@/constants/design-tokens';
import { Send, Square } from '@/constants/icons';
import { useCallback, useState } from 'react';
import { Platform, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ChatInputProps {
  onSend: (message: string) => void;
  /** A turn is in flight: the send button becomes a stop button. */
  isBusy?: boolean;
  onStop?: () => void;
  placeholder?: string;
}

export function ChatInput({
  onSend,
  isBusy = false,
  onStop,
  placeholder = 'Ask AI to adjust parameters...',
}: ChatInputProps) {
  const [text, setText] = useState('');
  const c = useDesign();
  const [focused, setFocused] = useState(false);
  const { fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, t.layout.related);

  const canSend = text.trim().length > 0 && !isBusy;

  const handleSend = useCallback(() => {
    if (!canSend) return;
    onSend(text.trim());
    setText('');
  }, [text, canSend, onSend]);

  return (
    <View
      testID="agent-chat-composer"
      style={{
        backgroundColor: c.workspace,
        paddingHorizontal: t.layout.inset,
        paddingTop: t.layout.related,
        paddingBottom: bottomPadding,
      }}
    >
      <View
        testID="agent-chat-input-surface"
        style={{
          minHeight: t.height.touch,
          flexDirection: 'row',
          alignItems: 'flex-end',
          paddingLeft: t.layout.rowX,
          borderRadius: t.radius.control,
          borderWidth: 1,
          borderColor: focused ? c.tint : 'transparent',
          backgroundColor: c.workspaceCard,
        }}
      >
        {/* Style prop required — className not supported by BottomSheetTextInput (used internally via AdaptiveTextInput) */}
        <AdaptiveTextInput
          style={{
            flex: 1,
            fontSize: t.type.body,
            lineHeight: t.leading.body,
            minWidth: 0,
            minHeight: t.height.touch,
            maxHeight: t.leading.body * t.chat.inputLines * fontScale + t.layout.related * 2,
            paddingVertical: t.layout.related,
            paddingRight: t.layout.related,
            color: c.ink,
            ...Platform.select({ web: { outlineWidth: 0 } }),
          }}
          placeholder={placeholder}
          placeholderTextColor={c.muted}
          value={text}
          onChangeText={setText}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onSubmitEditing={handleSend}
          multiline
          maxLength={2000}
          editable={!isBusy}
          blurOnSubmit={false}
        />
        {isBusy && onStop ? (
          <Action kind="primary" small icon={Square} label="Stop response" onPress={onStop} />
        ) : (
          <Action kind="primary" small icon={Send} label="Send message" onPress={handleSend} disabled={!canSend} />
        )}
      </View>
    </View>
  );
}
