import { Copy } from '@/components/ui/design-system/primitives';
import { Textarea, TextareaInput } from '@/components/ui/textarea';
import { View } from '@/components/ui/view';
import React from 'react';
import { designTokens as t } from '@/constants/design-tokens';

interface TextModeProps {
  initialValue: string;
  onChange: (value: string) => void;
  inputKey: number;
}

export function TextMode({ initialValue, onChange, inputKey }: TextModeProps) {
  return (
    <View className="flex-1">
      <Copy size="label" muted className="mb-2" style={{ fontWeight: '500' }}>
        Prompt
      </Copy>
      {/* Fixed height, so the sheet does not re-layout while the prompt grows. */}
      <Textarea key={inputKey} size="sm" className="bg-well w-full border-0" style={{ borderRadius: t.radius.control, height: 200 }}>
        <TextareaInput
          aria-label="Prompt"
          placeholder="Enter your prompt here..."
          defaultValue={initialValue}
          onChangeText={onChange}
          style={{ paddingHorizontal: t.layout.rowX, paddingVertical: t.layout.rowY }}
        />
      </Textarea>
    </View>
  );
}
