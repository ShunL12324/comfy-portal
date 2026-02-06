import { SegmentedControl } from '@/components/self-ui/segmented-control';
import { ThemedBottomSheetModal } from '@/components/self-ui/themed-bottom-sheet-modal';
import { Button, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useRouter } from 'expo-router';
import { X } from 'lucide-react-native';
import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Keyboard } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AIMode } from './ai-mode';
import { TagMode } from './tag-mode';
import { TextMode } from './text-mode';

type EditorMode = 'Text' | 'Tag' | 'AI';

interface PromptEditorModalProps {
  // Props can be extended as needed
}

export interface PromptEditorModalRef {
  present: (options: {
    initialValue: string;
    onSave: (value: string) => void;
    title?: string;
  }) => void;
}

export const PromptEditorModal = forwardRef<PromptEditorModalRef, PromptEditorModalProps>(
  (props, ref) => {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const bottomSheetModalRef = useRef<BottomSheetModal>(null);

    const [mode, setMode] = useState<EditorMode>('Text');
    const [value, setValue] = useState('');
    const [title, setTitle] = useState('Edit Prompt');
    const [onSaveCallback, setOnSaveCallback] = useState<((value: string) => void) | null>(null);

    useImperativeHandle(ref, () => ({
      present: (options) => {
        setValue(options.initialValue);
        setTitle(options.title || 'Edit Prompt');
        setOnSaveCallback(() => options.onSave);
        setMode('Text');
        bottomSheetModalRef.current?.present();
      },
    }));

    // Workaround: manually restore position when keyboard hides
    // https://github.com/gorhom/react-native-bottom-sheet/issues/1894
    useEffect(() => {
      const hideSubscription = Keyboard.addListener('keyboardWillHide', () => {
        bottomSheetModalRef.current?.snapToIndex(0);
      });
      return () => hideSubscription.remove();
    }, []);

    const handleClose = useCallback(() => {
      bottomSheetModalRef.current?.dismiss();
    }, []);

    const handleDone = useCallback(() => {
      if (onSaveCallback) {
        onSaveCallback(value);
      }
      handleClose();
    }, [value, onSaveCallback, handleClose]);

    const handleOpenSettings = useCallback(() => {
      handleClose();
      router.push('/settings/ai-assistant');
    }, [router, handleClose]);

    const handleModeChange = useCallback((newMode: string) => {
      setMode(newMode as EditorMode);
    }, []);

    const handleValueChange = useCallback((newValue: string) => {
      setValue(newValue);
    }, []);

    const handleAIAccept = useCallback((optimizedValue: string) => {
      setValue(optimizedValue);
      setMode('Text');
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
      >
        <View className="flex-1">
          {/* Header */}
          <HStack className="items-center justify-between px-4 pb-3">
            <Pressable onPress={handleClose} className="p-1">
              <Icon as={X} size="md" className="text-typography-500" />
            </Pressable>

            <Text className="text-base font-semibold text-typography-900">{title}</Text>

            <HStack space="sm" className="items-center">
              <Button size="sm" variant="solid" action="primary" onPress={handleDone} className="rounded-lg px-4">
                <ButtonText>Done</ButtonText>
              </Button>
            </HStack>
          </HStack>

          {/* Mode Selector */}
          <View className="px-4 py-3">
            <SegmentedControl
              options={['Text', 'Tag', 'AI']}
              value={mode}
              onChange={handleModeChange}
            />
          </View>

          {/* Content Area */}
          <BottomSheetScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingBottom: insets.bottom + 24,
            }}
          >
            {mode === 'Text' && (
              <TextMode value={value} onChange={handleValueChange} />
            )}
            {mode === 'Tag' && (
              <TagMode value={value} onChange={handleValueChange} />
            )}
            {mode === 'AI' && (
              <AIMode
                initialPrompt={value}
                onAccept={handleAIAccept}
                onOpenSettings={handleOpenSettings}
              />
            )}
          </BottomSheetScrollView>
        </View>
      </ThemedBottomSheetModal>
    );
  }
);

PromptEditorModal.displayName = 'PromptEditorModal';
