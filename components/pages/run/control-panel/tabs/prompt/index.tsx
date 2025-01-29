import { Text } from '@/components/ui/text';
import { Textarea, TextareaInput } from '@/components/ui/textarea';
import { VStack } from '@/components/ui/vstack';
import { TabProps } from '@/types/generation';
import React from 'react';

export function PromptTab({ params, onParamsChange }: TabProps) {
  return (
    <VStack space="lg" className="px-4 py-4">
      <VStack space="sm">
        <Text className="text-base font-medium text-primary-500">Prompt</Text>
        <Textarea className="min-h-[100px] overflow-hidden rounded-md border-0 outline-none">
          <TextareaInput
            value={params.prompt}
            onChangeText={(value: string) =>
              onParamsChange({ ...params, prompt: value })
            }
            placeholder="Describe what you want to generate..."
            className="h-full w-full rounded-md border-0 bg-background-50 px-3 py-2 text-sm outline-none placeholder:text-background-400"
            multiline
          />
        </Textarea>
      </VStack>

      <VStack space="sm">
        <Text className="text-base font-medium text-primary-500">
          Negative Prompt
        </Text>
        <Textarea className="min-h-[100px] overflow-hidden rounded-md border-0 outline-none">
          <TextareaInput
            value={params.negativePrompt}
            onChangeText={(value: string) =>
              onParamsChange({ ...params, negativePrompt: value })
            }
            placeholder="Describe what you don't want to see..."
            className="h-full w-full rounded-md border-0 bg-background-50 px-3 py-2 text-sm outline-none placeholder:text-background-400"
            multiline
          />
        </Textarea>
      </VStack>
    </VStack>
  );
}
