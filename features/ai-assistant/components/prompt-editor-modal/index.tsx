import { AdaptiveScrollView } from '@/components/self-ui/adaptive-sheet-components';
import { ThemedBottomSheetModal } from '@/components/self-ui/themed-bottom-sheet-modal';
import { Title, Action, Copy, Segments } from '@/components/ui/design-system/primitives';
import { HStack } from '@/components/ui/hstack';
import { View } from '@/components/ui/view';
import { designTokens as t } from '@/constants/design-tokens';
import { BottomSheetModal } from '@gorhom/bottom-sheet';

import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Keyboard } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TagMode } from './tag-mode';
import { TextMode } from './text-mode';

type EditorMode = 'Text' | 'Tag';

interface PromptEditorModalProps {
  // Props can be extended as needed
}

export interface PromptEditorModalRef {
  present: (options: { initialValue: string; onSave: (value: string) => void; title?: string }) => void;
}

export const PromptEditorModal = forwardRef<PromptEditorModalRef, PromptEditorModalProps>((props, ref) => {
  const insets = useSafeAreaInsets();
  const bottomSheetModalRef = useRef<BottomSheetModal>(null);

  const [mode, setMode] = useState<EditorMode>('Text');
  const [value, setValue] = useState('');
  const [title, setTitle] = useState('Edit Prompt');
  const [onSaveCallback, setOnSaveCallback] = useState<((value: string) => void) | null>(null);
  const [sessionKey, setSessionKey] = useState(0);
  // Track whether the modal is currently presented, so the global
  // keyboardWillHide listener only fires snapToIndex when this sheet
  // is actually visible — prevents conflicts with other BottomSheets.
  const isPresentedRef = useRef(false);

  useImperativeHandle(ref, () => ({
    present: (options) => {
      setSessionKey((prev) => prev + 1);
      setValue(options.initialValue);
      setTitle(options.title || 'Edit Prompt');
      setOnSaveCallback(() => options.onSave);
      setMode('Text');
      bottomSheetModalRef.current?.present();
      isPresentedRef.current = true;
    },
  }));

  // Workaround: manually restore position when keyboard hides
  // https://github.com/gorhom/react-native-bottom-sheet/issues/1894
  useEffect(() => {
    const hideSubscription = Keyboard.addListener('keyboardWillHide', () => {
      if (isPresentedRef.current) {
        bottomSheetModalRef.current?.snapToIndex(0);
      }
    });
    return () => hideSubscription.remove();
  }, []);

  const handleClose = useCallback(() => {
    isPresentedRef.current = false;
    bottomSheetModalRef.current?.dismiss();
  }, []);

  const handleDone = useCallback(() => {
    if (onSaveCallback) {
      onSaveCallback(value);
    }
    handleClose();
  }, [value, onSaveCallback, handleClose]);

  const handleModeChange = useCallback((newMode: string) => {
    setMode(newMode as EditorMode);
  }, []);

  const handleValueChange = useCallback((newValue: string) => {
    setValue(newValue);
  }, []);

  return (
    <ThemedBottomSheetModal
      ref={bottomSheetModalRef}
      index={0}
      snapPoints={['100%']}
      enableDynamicSizing={false}
      topInset={insets.top}
      enablePanDownToClose={true}
      keyboardBehavior="extend"
      keyboardBlurBehavior="restore"
      onDismiss={() => {
        isPresentedRef.current = false;
      }}
    >
      <View className="flex-1">
        {/* Header */}
        <HStack className="px-4 pb-3 items-center">
          <View className="flex-1 items-start">
            <Title compact numberOfLines={1}>
              {title}
            </Title>
          </View>

          <View className="items-end">
            <Action kind="primary" onPress={handleDone}>
              Done
            </Action>
          </View>
        </HStack>

        {/* Mode Selector */}
        <View className="px-4 py-3">
          <Segments options={['Text', 'Tag']} value={mode} onChange={handleModeChange} />
        </View>

        {/* Content Area */}
        <AdaptiveScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: t.layout.inset,
            paddingBottom: insets.bottom + t.layout.section,
          }}
        >
          {mode === 'Text' && <TextMode initialValue={value} onChange={handleValueChange} inputKey={sessionKey} />}
          {mode === 'Tag' && <TagMode value={value} onChange={handleValueChange} />}
        </AdaptiveScrollView>
      </View>
    </ThemedBottomSheetModal>
  );
});

PromptEditorModal.displayName = 'PromptEditorModal';
