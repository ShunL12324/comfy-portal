import React from 'react';
import { VStack } from '@/components/ui/vstack';
import { Text } from '@/components/ui/text';
import { Textarea, TextareaInput } from '@/components/ui/textarea';
import { TabProps } from '../types';

export function PromptTab({ params, onParamsChange }: TabProps) {
  return (
    <VStack space="lg" className="px-4 py-4">
      <VStack space="sm">
        <Text className="text-base font-medium text-primary-500">Prompt</Text>
        <Textarea className="overflow-hidden rounded-xl border-[0.5px] border-background-100">
          <TextareaInput
            value={params.prompt}
            onChangeText={(value: string) =>
              onParamsChange({ ...params, prompt: value })
            }
            placeholder="Describe what you want to generate..."
            className="min-h-[100] bg-background-50 px-3 py-2 text-sm text-primary-500 placeholder:text-background-400"
            multiline
          />
        </Textarea>
      </VStack>

      <VStack space="sm">
        <Text className="text-base font-medium text-primary-500">
          Negative Prompt
        </Text>
        <Textarea className="overflow-hidden rounded-xl border-[0.5px] border-background-100">
          <TextareaInput
            value={params.negativePrompt}
            onChangeText={(value: string) =>
              onParamsChange({ ...params, negativePrompt: value })
            }
            placeholder="Describe what you don't want to see..."
            className="min-h-[60] bg-background-50 px-3 py-2 text-sm text-primary-500 placeholder:text-background-400"
            multiline
          />
        </Textarea>
      </VStack>
    </VStack>
  );
}
