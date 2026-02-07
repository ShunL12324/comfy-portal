import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { PromptTemplate } from '@/features/ai-assistant/types';
import { Check, FileText, X } from 'lucide-react-native';
import { MotiView } from 'moti';
import React from 'react';

interface TemplateSelectorProps {
  templates: PromptTemplate[];
  selectedTemplateId: string | null;
  onSelect: (templateId: string) => void;
  onClose: () => void;
}

export function TemplateSelector({
  templates,
  selectedTemplateId,
  onSelect,
  onClose,
}: TemplateSelectorProps) {
  return (
    <MotiView
      from={{ opacity: 0, scale: 0.97, translateY: -4 }}
      animate={{ opacity: 1, scale: 1, translateY: 0 }}
      exit={{ opacity: 0, scale: 0.97, translateY: -4 }}
      transition={{ type: 'timing', duration: 150 }}
    >
      <View className="rounded-2xl bg-background-0 p-2">
        <HStack className="items-center justify-between px-1 py-1">
          <Text className="text-sm font-semibold text-typography-900">Choose Template</Text>
          <Pressable onPress={onClose} className="rounded-md p-1">
            <Icon as={X} size="sm" className="text-typography-500" />
          </Pressable>
        </HStack>

        {templates.length === 0 ? (
          <View className="items-center px-3 py-6">
            <View className="rounded-full bg-background-50 p-2.5">
              <Icon as={FileText} size="sm" className="text-typography-400" />
            </View>
            <Text className="mt-2 text-sm font-medium text-typography-700">No templates available</Text>
            <Text className="mt-1 text-xs text-typography-500">Create one in settings first.</Text>
          </View>
        ) : (
          <VStackList>
            {templates.map((template) => {
              const isSelected = selectedTemplateId === template.id;
              return (
                <Pressable
                  key={template.id}
                  onPress={() => onSelect(template.id)}
                  className={`flex-row items-center justify-between rounded-lg px-3 py-2.5 ${
                    isSelected ? 'bg-primary-100' : 'bg-background-50 active:bg-background-100'
                  }`}
                >
                  <Text className={`flex-1 text-sm ${isSelected ? 'text-primary-700' : 'text-typography-900'}`}>
                    {template.name}
                  </Text>
                  {isSelected && <Icon as={Check} size="sm" className="text-primary-600" />}
                </Pressable>
              );
            })}
          </VStackList>
        )}
      </View>
    </MotiView>
  );
}

function VStackList({ children }: { children: React.ReactNode }) {
  return <View className="gap-1">{children}</View>;
}
