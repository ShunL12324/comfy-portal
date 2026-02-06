import { AppBar } from '@/components/layout/app-bar';
import { Button, ButtonIcon, ButtonText } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { ScrollView } from '@/components/ui/scroll-view';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { VStack } from '@/components/ui/vstack';
import {
  TemplateEditorModal,
  TemplateEditorModalRef,
} from '@/features/ai-assistant/components/template-editor-modal';
import { useAIAssistantStore } from '@/features/ai-assistant/stores/ai-assistant-store';
import { PromptTemplate } from '@/features/ai-assistant/types';
import { ChevronRight, Plus } from 'lucide-react-native';
import { useRef } from 'react';

export default function TemplatesScreen() {
  const { templates } = useAIAssistantStore();
  const editorModalRef = useRef<TemplateEditorModalRef>(null);

  const handleAddTemplate = () => {
    editorModalRef.current?.present({ mode: 'add' });
  };

  const handleEditTemplate = (template: PromptTemplate) => {
    editorModalRef.current?.present({ mode: 'edit', template });
  };

  return (
    <View className="flex-1 bg-background-0">
      <AppBar
        title="Prompt Templates"
        showBack
        rightElement={
          <Button
            size="sm"
            variant="solid"
            action="primary"
            onPress={handleAddTemplate}
            className="rounded-lg"
          >
            <ButtonIcon as={Plus} />
            <ButtonText>Add</ButtonText>
          </Button>
        }
      />
      <ScrollView className="flex-1">
        <VStack className="px-5 pb-8 pt-4" space="sm">
          {templates.length > 0 ? (
            templates.map((template) => (
              <Pressable
                key={template.id}
                className="flex-row items-center justify-between rounded-lg bg-background-50 px-4 py-3"
                onPress={() => handleEditTemplate(template)}
              >
                <View className="flex-1">
                  <Text className="text-sm font-medium text-typography-900">{template.name}</Text>
                  <Text className="mt-0.5 text-xs text-typography-500" numberOfLines={1}>
                    {template.systemPrompt.substring(0, 60)}...
                  </Text>
                </View>
                <Icon as={ChevronRight} size="sm" className="text-typography-400" />
              </Pressable>
            ))
          ) : (
            <View className="mt-4 items-center rounded-lg bg-background-50 py-8">
              <Text className="text-sm text-typography-500">No templates yet</Text>
              <Text className="mt-1 text-xs text-typography-400">
                Tap "Add" to create your first template
              </Text>
            </View>
          )}
        </VStack>
      </ScrollView>
      <TemplateEditorModal ref={editorModalRef} />
    </View>
  );
}
