import { BottomSheetTextarea } from '@/components/self-ui/bottom-sheet-textarea';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import React from 'react';

interface TextModeProps {
  initialValue: string;
  onChange: (value: string) => void;
  inputKey: number;
}

export function TextMode({ initialValue, onChange, inputKey }: TextModeProps) {
  return (
    <View className="flex-1">
      <Text className="mb-2 text-sm font-medium text-typography-600">Prompt</Text>
      <BottomSheetTextarea
        key={inputKey}
        placeholder="Enter your prompt here..."
        defaultValue={initialValue}
        onChangeText={onChange}
        minHeight={200}
      />
    </View>
  );
}
