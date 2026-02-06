import { AppBar } from '@/components/layout/app-bar';
import { FormInput } from '@/components/self-ui/form-input';
import { NumberSlider } from '@/components/self-ui/slider';
import { Button, ButtonIcon, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { ScrollView } from '@/components/ui/scroll-view';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { VStack } from '@/components/ui/vstack';
import { useAIAssistantStore } from '@/features/ai-assistant/stores/ai-assistant-store';
import { AIService } from '@/services/ai-service';
import { showToast } from '@/utils/toast';
import { CircleCheck, CircleX } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ProviderScreen() {
  const insets = useSafeAreaInsets();
  const { provider, setProvider } = useAIAssistantStore();

  const [endpointUrl, setEndpointUrl] = useState(provider?.endpointUrl || 'https://api.openai.com/v1');
  const [apiKey, setApiKey] = useState(provider?.apiKey || '');
  const [modelName, setModelName] = useState(provider?.modelName || 'gpt-4o-mini');
  const [temperature, setTemperature] = useState(provider?.temperature ?? 0.7);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);

  const handleSave = () => {
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

  return (
    <View className="flex-1 bg-background-0">
      <AppBar title="API Provider" showBack />
      <ScrollView className="flex-1">
        <VStack className="px-5 pb-8 pt-4" space="sm">
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

          <View>
            <Text className="mb-2 text-sm font-medium text-typography-600">
              Temperature: {temperature.toFixed(1)}
            </Text>
            <NumberSlider
              value={temperature}
              minValue={0}
              maxValue={2}
              step={0.1}
              onChange={setTemperature}
              showButtons={false}
            />
          </View>

          <HStack space="sm" className="mt-4">
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
              <ButtonText>Test Connection</ButtonText>
            </Button>
            <Button
              variant="solid"
              action="primary"
              onPress={handleSave}
              className="flex-1 rounded-lg"
            >
              <ButtonText>Save</ButtonText>
            </Button>
          </HStack>
        </VStack>
      </ScrollView>
    </View>
  );
}
