import { BottomSheetFormInput } from '@/components/self-ui/form-input/bottom-sheet-form-input';
import { BottomSheetTextarea } from '@/components/self-ui/bottom-sheet-textarea';
import { ConfirmDialog } from '@/components/self-ui/confirm-dialog';
import { ThemedBottomSheetModal } from '@/components/self-ui/themed-bottom-sheet-modal';
import { Button, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { VStack } from '@/components/ui/vstack';
import { PromptTemplate } from '@/features/ai-assistant/types';
import { BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Info, Trash2, X } from 'lucide-react-native';
import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Keyboard } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAIAssistantStore } from '../stores/ai-assistant-store';

type EditorMode = 'view' | 'edit' | 'add';

interface TemplateEditorModalProps {}

export interface TemplateEditorModalRef {
  present: (options: {
    mode: EditorMode;
    template?: PromptTemplate;
  }) => void;
}

const MAX_NAME_LENGTH = 50;

export const TemplateEditorModal = forwardRef<TemplateEditorModalRef, TemplateEditorModalProps>(
  (props, ref) => {
    const insets = useSafeAreaInsets();
    const bottomSheetModalRef = useRef<BottomSheetModal>(null);
    const { addTemplate, updateTemplate, removeTemplate } = useAIAssistantStore();

    const [mode, setMode] = useState<EditorMode>('add');
    const [templateId, setTemplateId] = useState<string | null>(null);
    const [name, setName] = useState('');
    const [systemPrompt, setSystemPrompt] = useState('');
    const [nameError, setNameError] = useState('');
    const [promptError, setPromptError] = useState('');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const isReadOnly = mode === 'view';

    useImperativeHandle(ref, () => ({
      present: (options) => {
        setMode(options.mode);
        if (options.template) {
          setTemplateId(options.template.id);
          setName(options.template.name);
          setSystemPrompt(options.template.systemPrompt);
        } else {
          setTemplateId(null);
          setName('');
          setSystemPrompt('');
        }
        setNameError('');
        setPromptError('');
        bottomSheetModalRef.current?.present();
      },
    }));

    // Workaround: manually restore position when keyboard hides
    useEffect(() => {
      const hideSubscription = Keyboard.addListener('keyboardWillHide', () => {
        bottomSheetModalRef.current?.snapToIndex(0);
      });
      return () => hideSubscription.remove();
    }, []);

    const getTitle = () => {
      switch (mode) {
        case 'view':
          return 'View Template';
        case 'edit':
          return 'Edit Template';
        case 'add':
          return 'Add Template';
      }
    };

    const validateForm = (): boolean => {
      let valid = true;

      if (!name.trim()) {
        setNameError('Name is required');
        valid = false;
      } else if (name.length > MAX_NAME_LENGTH) {
        setNameError(`Name must be less than ${MAX_NAME_LENGTH} characters`);
        valid = false;
      } else {
        setNameError('');
      }

      if (!systemPrompt.trim()) {
        setPromptError('System prompt is required');
        valid = false;
      } else if (!systemPrompt.includes('{{user_prompt}}')) {
        setPromptError('System prompt must contain {{user_prompt}}');
        valid = false;
      } else {
        setPromptError('');
      }

      return valid;
    };

    const handleSave = useCallback(() => {
      if (!validateForm()) return;

      if (mode === 'add') {
        addTemplate({ name: name.trim(), systemPrompt: systemPrompt.trim() });
      } else if (mode === 'edit' && templateId) {
        updateTemplate(templateId, { name: name.trim(), systemPrompt: systemPrompt.trim() });
      }

      handleClose();
    }, [mode, name, systemPrompt, templateId, addTemplate, updateTemplate]);

    const handleClose = useCallback(() => {
      setName('');
      setSystemPrompt('');
      setNameError('');
      setPromptError('');
      setTemplateId(null);
      setShowDeleteConfirm(false);
      bottomSheetModalRef.current?.dismiss();
    }, []);

    const handleDelete = useCallback(() => {
      if (templateId) {
        removeTemplate(templateId);
        handleClose();
      }
    }, [templateId, removeTemplate, handleClose]);

    return (
      <>
        <ThemedBottomSheetModal
          ref={bottomSheetModalRef}
          index={0}
          snapPoints={['85%']}
          onDismiss={handleClose}
          topInset={insets.top}
          enablePanDownToClose={true}
          keyboardBehavior="extend"
          keyboardBlurBehavior="restore"
        >
          <View className="flex-1">
          {/* Header */}
          <HStack className="items-center justify-between border-b border-outline-100 px-4 pb-3">
            <Pressable onPress={handleClose} className="p-1">
              <Icon as={X} size="md" className="text-typography-500" />
            </Pressable>
            <Text className="text-base font-semibold text-typography-900">{getTitle()}</Text>
            {mode === 'edit' ? (
              <Pressable onPress={() => setShowDeleteConfirm(true)} className="p-1">
                <Icon as={Trash2} size="md" className="text-error-500" />
              </Pressable>
            ) : (
              <View style={{ width: 28 }} />
            )}
          </HStack>

          <BottomSheetScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingBottom: insets.bottom + 24,
            }}
          >
            <VStack space="md" className="pt-4">
              {/* Name Input */}
              <BottomSheetFormInput
                title="Name"
                error={nameError}
                value={name}
                onChangeText={(value: string) => {
                  setName(value);
                  setNameError('');
                }}
                placeholder="Template name"
                maxLength={MAX_NAME_LENGTH}
                editable={!isReadOnly}
              />

              {/* System Prompt */}
              <View>
                <Text className="mb-2 text-sm font-medium text-typography-600">System Prompt</Text>
                <BottomSheetTextarea
                  placeholder="Enter system prompt..."
                  value={systemPrompt}
                  onChangeText={(value: string) => {
                    setSystemPrompt(value);
                    setPromptError('');
                  }}
                  minHeight={200}
                  editable={!isReadOnly}
                />
                {promptError ? (
                  <Text className="mt-1 text-xs text-error-500">{promptError}</Text>
                ) : null}
              </View>

              {/* Info hint */}
              {!isReadOnly && (
                <HStack className="items-start rounded-lg bg-primary-50 p-3" space="sm">
                  <Icon as={Info} size="sm" className="mt-0.5 text-primary-500" />
                  <Text className="flex-1 text-xs text-primary-700">
                    Use {'{{user_prompt}}'} as a placeholder where the user's prompt will be inserted.
                  </Text>
                </HStack>
              )}

              {/* Action Buttons */}
              <HStack space="sm" className="mt-4">
                {isReadOnly ? (
                  <Button
                    variant="solid"
                    action="primary"
                    onPress={handleClose}
                    className="flex-1 rounded-lg"
                  >
                    <ButtonText>Close</ButtonText>
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      onPress={handleClose}
                      className="flex-1 rounded-lg"
                    >
                      <ButtonText>Cancel</ButtonText>
                    </Button>
                    <Button
                      variant="solid"
                      action="primary"
                      onPress={handleSave}
                      className="flex-1 rounded-lg"
                    >
                      <ButtonText>{mode === 'add' ? 'Add' : 'Save'}</ButtonText>
                    </Button>
                  </>
                )}
              </HStack>
            </VStack>
          </BottomSheetScrollView>
        </View>
      </ThemedBottomSheetModal>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Template"
        description="Are you sure you want to delete this template? This action cannot be undone."
        confirmText="Delete"
        confirmButtonColor="bg-error-500"
      />
    </>
  );
},
);

TemplateEditorModal.displayName = 'TemplateEditorModal';
