import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { RotatingSpinner } from '@/components/ui/rotating-spinner';
import { useGenerationStatus } from '@/features/generation/context/generation-context';
import { Wand2 } from 'lucide-react-native';
import React, { memo } from 'react';
import { Pressable, View } from 'react-native';
import { QueueBadge } from './queue-badge';

interface GenerateActionButtonProps {
  onGenerate: () => void;
}

export const GenerateActionButton = memo(({ onGenerate }: GenerateActionButtonProps) => {
  const { status } = useGenerationStatus();

  const renderButton = () => {
    if (status === 'downloading') {
      return (
        <View
          className="min-w-[100px] flex-row items-center justify-center rounded-full bg-background-100 px-3.5 py-2 opacity-70"
        >
          <RotatingSpinner size="sm" className="mr-1.5" />
          <Text className="text-xs font-semibold text-typography-500">Saving...</Text>
        </View>
      );
    }

    return (
      <Pressable
        onPress={onGenerate}
        className="min-w-[100px] flex-row items-center justify-center rounded-full bg-primary-500 px-3.5 py-2 active:bg-primary-600"
      >
        <Icon as={Wand2} size="2xs" className="text-typography-0 mr-1.5" />
        <Text className="text-xs font-semibold text-typography-0">Generate</Text>
      </Pressable>
    );
  };

  return (
    <View className="flex-row items-center">
      {renderButton()}
      <QueueBadge />
    </View>
  );
});

GenerateActionButton.displayName = 'GenerateActionButton';
