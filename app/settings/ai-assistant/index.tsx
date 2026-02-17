import { AdaptiveScrollView } from '@/components/self-ui/adaptive-sheet-components';
import { AppBar } from '@/components/layout/app-bar';
import { StyledTextarea } from '@/components/self-ui/styled-textarea';
import { FormInput } from '@/components/self-ui/form-input';
import { ThemedBottomSheetModal } from '@/components/self-ui/themed-bottom-sheet-modal';
import { NumberSlider } from '@/components/self-ui/slider';
import { Button, ButtonIcon, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import { ScrollView } from '@/components/ui/scroll-view';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { VStack } from '@/components/ui/vstack';
import { useAIAssistantStore } from '@/features/ai-assistant/stores/ai-assistant-store';
import { AIService } from '@/services/ai-service';
import { showToast } from '@/utils/toast';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { CircleCheck, CircleX, Pencil, X } from 'lucide-react-native';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Keyboard } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function AIAssistantScreen() {
  const insets = useSafeAreaInsets();
  const { provider, setProvider, customPrompt, setCustomPrompt } = useAIAssistantStore();
  const promptSheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ['90%'], []);

  const [endpointUrl, setEndpointUrl] = useState(provider?.endpointUrl || 'https://api.openai.com/v1');
  const [apiKey, setApiKey] = useState(provider?.apiKey || '');
  const [modelName, setModelName] = useState(provider?.modelName || 'gpt-4o-mini');
  const [temperature, setTemperature] = useState(provider?.temperature ?? 0.7);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [draftPrompt, setDraftPrompt] = useState(customPrompt);

  const handleOpenPromptSheet = useCallback(() => {
    setDraftPrompt(customPrompt);
    Keyboard.dismiss();
    promptSheetRef.current?.present();
  }, [customPrompt]);

  const handleSavePrompt = useCallback(() => {
    setCustomPrompt(draftPrompt);
    promptSheetRef.current?.dismiss();
    showToast.success('Saved', 'Custom prompt saved', insets.top + 8);
  }, [draftPrompt, setCustomPrompt, insets.top]);

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

  return (
    <View className="flex-1 bg-background-0">
      <AppBar title="AI Assistant" showBack />
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

          <View className="rounded-xl bg-background-50 p-3">
            <HStack className="mb-2 items-center justify-between">
              <Text className="text-sm font-medium text-typography-600">Custom Prompt</Text>
              <Pressable onPress={handleOpenPromptSheet}>
                <HStack className="items-center" space="xs">
                  <Pencil size={14} className="text-primary-500" />
                  <Text className="text-sm text-primary-500">Edit</Text>
                </HStack>
              </Pressable>
            </HStack>
            <Pressable onPress={handleOpenPromptSheet}>
              <Text
                className="text-sm text-typography-500"
                numberOfLines={3}
              >
                {customPrompt || 'Tap to add custom instructions that will be injected into the system prompt...'}
              </Text>
            </Pressable>
          </View>

          <HStack space="sm" className="mt-2">
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
      </ScrollView>

      <ThemedBottomSheetModal
        ref={promptSheetRef}
        snapPoints={snapPoints}
        enableDynamicSizing={false}
      >
        <AdaptiveScrollView>
          <VStack className="px-5 pb-8" space="md">
            <HStack className="items-center justify-between">
              <Pressable onPress={() => promptSheetRef.current?.dismiss()}>
                <X size={20} className="text-typography-500" />
              </Pressable>
              <Text className="text-base font-semibold text-typography-900">Custom Prompt</Text>
              <Pressable onPress={handleSavePrompt}>
                <Text className="text-sm font-medium text-primary-500">Save</Text>
              </Pressable>
            </HStack>

            <Text className="text-xs text-typography-500">
              Custom instructions injected into the AI system prompt. Use this to guide the AI's style, language, or focus.
            </Text>

            <StyledTextarea
              placeholder="e.g. Always use anime style, prefer warm lighting, output in Japanese..."
              value={draftPrompt}
              onChangeText={setDraftPrompt}
              minHeight={200}
            />
          </VStack>
        </AdaptiveScrollView>
      </ThemedBottomSheetModal>
    </View>
  );
}
