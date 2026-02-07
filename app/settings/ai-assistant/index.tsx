import { AppBar } from '@/components/layout/app-bar';
import { FormInput } from '@/components/self-ui/form-input';
import { NumberSlider } from '@/components/self-ui/slider';
import { Button, ButtonIcon, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
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
import { AIService } from '@/services/ai-service';
import { showToast } from '@/utils/toast';
import { CircleCheck, CircleX, ChevronRight, Plus } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function AIAssistantScreen() {
  const insets = useSafeAreaInsets();
  const { provider, setProvider, templates } = useAIAssistantStore();
  const editorModalRef = useRef<TemplateEditorModalRef>(null);

  const [endpointUrl, setEndpointUrl] = useState(provider?.endpointUrl || 'https://api.openai.com/v1');
  const [apiKey, setApiKey] = useState(provider?.apiKey || '');
  const [modelName, setModelName] = useState(provider?.modelName || 'gpt-4o-mini');
  const [temperature, setTemperature] = useState(provider?.temperature ?? 0.7);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);

  const handleSaveProvider = () => {
    if (!endpointUrl || !apiKey || !modelName) {
      showToast.error('Error', 'Please fill in all required fields', insets.top + 8);
      return;
    }

    setProvider({
      name: 'OpenAI Compatible',
      endpointUrl,
      apiKey,
      modelName,
      temperature,
    });
    showToast.success('Saved', 'API configuration saved', insets.top + 8);
  };

  const handleTestConnection = async () => {
    if (!endpointUrl || !apiKey || !modelName) {
      showToast.error('Error', 'Please fill in all required fields', insets.top + 8);
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    const service = new AIService({
      endpointUrl,
      apiKey,
      modelName,
    });

    const result = await service.testConnection();
    setIsTesting(false);
    setTestResult(result.success ? 'success' : 'error');

    if (result.success) {
      showToast.success('Success', 'Connection test passed', insets.top + 8);
    } else {
      showToast.error('Failed', result.error || 'Connection test failed', insets.top + 8);
    }
  };

  const handleAddTemplate = () => {
    editorModalRef.current?.present({ mode: 'add' });
  };

  const handleEditTemplate = (template: PromptTemplate) => {
    editorModalRef.current?.present({ mode: 'edit', template });
  };

  const renderTemplateItem = (template: PromptTemplate) => (
    <Button
      key={template.id}
      variant="link"
      action="secondary"
      onPress={() => handleEditTemplate(template)}
      className="h-auto justify-between rounded-xl bg-background-50 px-4 py-3"
    >
      <HStack className="w-full items-center justify-between">
        <View className="flex-1">
          <Text className="text-sm font-medium text-typography-900">{template.name}</Text>
          <Text className="mt-1 text-xs text-typography-500" numberOfLines={1}>
            {template.systemPrompt.substring(0, 90)}
          </Text>
        </View>
        <Icon as={ChevronRight} size="sm" className="text-typography-400" />
      </HStack>
    </Button>
  );

  return (
    <View className="flex-1 bg-background-0">
      <AppBar title="AI Assistant" showBack />
      <ScrollView className="flex-1">
        <VStack className="px-5 pb-8 pt-4" space="xl">
          <VStack space="md">
            <Text className="text-sm font-semibold text-typography-900">API Provider</Text>
            <VStack space="sm">
              <FormInput
                title="Endpoint URL"
                placeholder="https://api.openai.com/v1"
                value={endpointUrl}
                onChangeText={setEndpointUrl}
                autoCapitalize="none"
                autoCorrect={false}
              />

              <FormInput
                title="API Key"
                placeholder="sk-..."
                value={apiKey}
                onChangeText={setApiKey}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />

              <FormInput
                title="Model Name"
                placeholder="gpt-4o-mini"
                value={modelName}
                onChangeText={setModelName}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </VStack>

            <View className="rounded-xl bg-background-50 p-3">
              <HStack className="mb-2 items-center justify-between">
                <Text className="text-sm font-medium text-typography-600">Temperature</Text>
                <Text className="text-sm text-typography-500">{temperature.toFixed(1)}</Text>
              </HStack>
              <NumberSlider
                value={temperature}
                minValue={0}
                maxValue={2}
                step={0.1}
                onChange={setTemperature}
                showButtons={false}
              />
            </View>

            <HStack space="sm">
              <Button
                variant="outline"
                onPress={handleTestConnection}
                disabled={isTesting}
                className="flex-1 rounded-lg"
              >
                {isTesting ? (
                  <ActivityIndicator size="small" />
                ) : testResult === 'success' ? (
                  <ButtonIcon as={CircleCheck} className="text-success-500" />
                ) : testResult === 'error' ? (
                  <ButtonIcon as={CircleX} className="text-error-500" />
                ) : null}
                <ButtonText>Test</ButtonText>
              </Button>
              <Button
                variant="solid"
                action="primary"
                onPress={handleSaveProvider}
                className="flex-1 rounded-lg"
              >
                <ButtonText>Save</ButtonText>
              </Button>
            </HStack>
          </VStack>

          <VStack space="sm">
            <HStack className="items-center justify-between">
              <Text className="text-sm font-semibold text-typography-900">Prompt Templates</Text>
              <Button size="xs" variant="link" action="primary" onPress={handleAddTemplate} className="px-0">
                <ButtonIcon as={Plus} />
                <ButtonText>Add</ButtonText>
              </Button>
            </HStack>

            {templates.length > 0 ? (
              <VStack space="sm">
                {templates.map(renderTemplateItem)}
              </VStack>
            ) : (
              <View className="items-center rounded-xl bg-background-50 px-6 py-8">
                <Text className="text-sm font-medium text-typography-700">No templates yet</Text>
                <Button
                  size="sm"
                  variant="solid"
                  action="primary"
                  onPress={handleAddTemplate}
                  className="mt-3 rounded-lg px-4"
                >
                  <ButtonIcon as={Plus} />
                  <ButtonText>Create Template</ButtonText>
                </Button>
              </View>
            )}
          </VStack>
        </VStack>
      </ScrollView>
      <TemplateEditorModal ref={editorModalRef} />
    </View>
  );
}
