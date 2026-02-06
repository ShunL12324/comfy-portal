import { Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { PromptTemplate } from '@/features/ai-assistant/types';
import { Check, FileText } from 'lucide-react-native';
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
  const builtInTemplates = templates.filter((t) => t.isBuiltIn);
  const customTemplates = templates.filter((t) => !t.isBuiltIn);

  return (
    <MotiView
      from={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: 'timing', duration: 150 }}
    >
      <View className="rounded-lg border border-outline-100 bg-background-0 shadow-sm">
        {/* Built-in Templates */}
        {builtInTemplates.length > 0 && (
          <View>
            <Text className="px-3 py-2 text-xs font-medium uppercase text-typography-400">
              Built-in
            </Text>
            {builtInTemplates.map((template) => (
              <Pressable
                key={template.id}
                onPress={() => onSelect(template.id)}
                className="flex-row items-center justify-between px-3 py-2.5 active:bg-background-50"
              >
                <Text className="flex-1 text-sm text-typography-900">{template.name}</Text>
                {selectedTemplateId === template.id && (
                  <Icon as={Check} size="sm" className="text-primary-500" />
                )}
              </Pressable>
            ))}
          </View>
        )}

        {/* Custom Templates */}
        {customTemplates.length > 0 && (
          <View>
            <View className="mx-3 border-t border-outline-100" />
            <Text className="px-3 py-2 text-xs font-medium uppercase text-typography-400">
              Custom
            </Text>
            {customTemplates.map((template) => (
              <Pressable
                key={template.id}
                onPress={() => onSelect(template.id)}
                className="flex-row items-center justify-between px-3 py-2.5 active:bg-background-50"
              >
                <Text className="flex-1 text-sm text-typography-900">{template.name}</Text>
                {selectedTemplateId === template.id && (
                  <Icon as={Check} size="sm" className="text-primary-500" />
                )}
              </Pressable>
            ))}
          </View>
        )}

        {/* Empty State */}
        {templates.length === 0 && (
          <View className="items-center px-3 py-5">
            <View className="rounded-full bg-background-50 p-2.5">
              <Icon as={FileText} size="sm" className="text-typography-400" />
            </View>
            <Text className="mt-2 text-sm font-medium text-typography-700">No templates available</Text>
            <Text className="mt-1 text-xs text-typography-500">Create one in settings first.</Text>
          </View>
        )}
      </View>
    </MotiView>
  );
}
