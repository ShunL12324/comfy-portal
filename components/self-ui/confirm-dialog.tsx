import { Button, ButtonText } from '@/components/ui/button';
import { Heading } from '@/components/ui/heading';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { Colors } from '@/constants/Colors';
import { useThemeStore } from '@/store/theme';
import { AnimatePresence, MotiView } from 'moti';
import React from 'react';
import { Modal, Pressable, View } from 'react-native';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  confirmButtonVariant?: 'solid' | 'outline' | 'link';
  confirmButtonColor?: string; // e.g., 'bg-error-500'
}

export const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmButtonVariant = 'solid',
  confirmButtonColor = 'bg-primary-500',
}: ConfirmDialogProps) => {
  const { theme } = useThemeStore();
  const activeTheme = theme ?? 'light';

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View className="flex-1 items-center justify-center p-4">
        {/* Backdrop */}
        <AnimatePresence>
          {isOpen && (
            <MotiView
              key="backdrop"
              from={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              transition={{ type: 'timing', duration: 200 }}
              className="absolute inset-0 bg-black"
            >
              <Pressable style={{ flex: 1 }} onPress={onClose} />
            </MotiView>
          )}
        </AnimatePresence>

        {/* Content */}
        <AnimatePresence>
          {isOpen && (
            <MotiView
              key="content"
              from={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              style={{
                backgroundColor: Colors[activeTheme].background[200],
                width: '100%',
                maxWidth: 400,
                borderRadius: 12,
                overflow: 'hidden',
              }}
            >
              <View className="p-6">
                <Heading size="sm" className="mb-2 text-typography-950">
                  {title}
                </Heading>
                <Text className="mb-6 text-sm text-typography-400">
                  {description}
                </Text>
                <HStack space="sm">
                  <Button
                    variant="outline"
                    onPress={onClose}
                    className="flex-1 rounded-md bg-background-100 py-2"
                  >
                    <ButtonText className="text-sm text-primary-400">{cancelText}</ButtonText>
                  </Button>
                  <Button
                    variant={confirmButtonVariant}
                    onPress={onConfirm}
                    className={`flex-1 rounded-md ${confirmButtonColor} active:opacity-80 py-2`}
                  >
                    <ButtonText className="text-sm text-background-0">{confirmText}</ButtonText>
                  </Button>
                </HStack>
              </View>
            </MotiView>
          )}
        </AnimatePresence>
      </View>
    </Modal>
  );
};
