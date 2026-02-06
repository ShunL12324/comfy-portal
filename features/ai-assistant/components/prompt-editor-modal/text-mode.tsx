import { BottomSheetTextarea } from '@/components/self-ui/bottom-sheet-textarea';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import React from 'react';

interface TextModeProps {
  value: string;
  onChange: (value: string) => void;
}

export function TextMode({ value, onChange }: TextModeProps) {
  return (
    <View className="flex-1">
      <Text className="mb-2 text-sm font-medium text-typography-600">Prompt</Text>
      <BottomSheetTextarea
        placeholder="Enter your prompt here..."
        value={value}
        onChangeText={onChange}
        minHeight={200}
      />
    </View>
  );
}
