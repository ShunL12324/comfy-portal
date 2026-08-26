import { AdaptiveScrollView } from '@/components/self-ui/adaptive-sheet-components';
import { AppBar } from '@/components/layout/app-bar';
import { StyledTextarea } from '@/components/self-ui/styled-textarea';
import { FormInput } from '@/components/self-ui/form-input';
import { ThemedBottomSheetModal } from '@/components/self-ui/themed-bottom-sheet-modal';
import { NumberSlider } from '@/components/self-ui/slider';
import { Button, ButtonIcon, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { ScrollView } from '@/components/ui/scroll-view';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { VStack } from '@/components/ui/vstack';
import { OptionSelector } from '@/components/common/selectors/option-selector';
import { ProviderLogo } from '@/features/ai-assistant/components/provider-logo';
import { useAIAssistantStore } from '@/features/ai-assistant/stores/ai-assistant-store';
import {
  PROVIDER_LABELS,
  PROVIDER_MODEL_HINTS,
  PROVIDER_ORDER,
  createLanguageModel,
  requiresEndpoint,
} from '@/features/ai-assistant/model';
import {
  getCatalogDate,
  getCatalogModels,
  refreshCatalog,
} from '@/features/ai-assistant/model-catalog';
import type { AIProviderType } from '@/features/ai-assistant/types';
import { showToast } from '@/utils/toast';
import { generateText } from 'ai';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { CircleCheck, CircleX, Pencil, RefreshCw, X } from 'lucide-react-native';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Keyboard } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Sentinel for the trailing "Custom…" row. Prefixed so it can never collide
 * with a real model id.
 */
const CUSTOM_MODEL = '__custom__';

export default function AIAssistantScreen() {
  const insets = useSafeAreaInsets();
  const { provider, setProvider, customPrompt, setCustomPrompt } = useAIAssistantStore();
  const promptSheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ['90%'], []);

  const [type, setType] = useState<AIProviderType>(provider?.type ?? 'openai');
  const [endpointUrl, setEndpointUrl] = useState(provider?.endpointUrl || '');
  const [apiKey, setApiKey] = useState(provider?.apiKey || '');
  const [modelName, setModelName] = useState(provider?.modelName || '');
  const [temperature, setTemperature] = useState(provider?.temperature ?? 0.7);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [draftPrompt, setDraftPrompt] = useState(customPrompt);

  const needsEndpoint = requiresEndpoint(type);
  const [catalogVersion, setCatalogVersion] = useState(0);
  const [isRefreshingCatalog, setIsRefreshingCatalog] = useState(false);
  // catalogVersion is a refresh trigger: refreshCatalog swaps a module-level
  // copy, which React can't observe on its own.
  const catalogModels = useMemo(
    () => getCatalogModels(type),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [type, catalogVersion],
  );

  const handleRefreshCatalog = useCallback(async () => {
    setIsRefreshingCatalog(true);
    try {
      const count = await refreshCatalog();
      setCatalogVersion((v) => v + 1);
      showToast.success('Updated', `${count} models available`, insets.top + 8);
    } catch (error) {
      showToast.error(
        'Failed',
        error instanceof Error ? error.message : 'Could not reach models.dev',
        insets.top + 8,
      );
    } finally {
      setIsRefreshingCatalog(false);
    }
  }, [insets.top]);

  // A saved model id that isn't in the catalogue means the user typed it (or
  // the catalogue has moved on), so the custom field opens on its own.
  const [customModel, setCustomModel] = useState(false);
  const isCustomModel =
    customModel || Boolean(modelName && !catalogModels.some((m) => m.id === modelName));

  /** Fields required to build a working model, per provider type. */
  const isComplete = Boolean(apiKey && modelName && (!needsEndpoint || endpointUrl));

  // Never send an endpoint a provider doesn't take one for. The field is hidden
  // for those providers, so a value left over from an earlier selection would
  // silently redirect the provider to the wrong host with nothing on screen to
  // explain it.
  const effectiveEndpoint = needsEndpoint ? endpointUrl : '';

  const draftProvider = () => ({
    type,
    name: PROVIDER_LABELS[type],
    endpointUrl: effectiveEndpoint || undefined,
    apiKey,
    modelName,
    temperature,
  });

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
    if (!isComplete) {
      showToast.error('Error', 'Please fill in all required fields', insets.top + 8);
      return;
    }

    setProvider(draftProvider());
    showToast.success('Saved', 'API configuration saved', insets.top + 8);
  };

  const handleTestConnection = async () => {
    if (!isComplete) {
      showToast.error('Error', 'Please fill in all required fields', insets.top + 8);
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    const draft = draftProvider();
    const started = Date.now();
    console.log('[ai-test] start', {
      type: draft.type,
      model: draft.modelName,
      endpoint: draft.endpointUrl ?? '(provider default)',
      keyLength: draft.apiKey.length,
    });

    try {
      // No output cap: a reasoning model would otherwise spend the whole budget
      // on reasoning tokens and return empty content, failing a valid config.
      const result = await generateText({
        model: createLanguageModel({ id: 'test', ...draft }),
        prompt: 'Reply with OK.',
      });
      console.log('[ai-test] ok', {
        ms: Date.now() - started,
        finishReason: result.finishReason,
        text: result.text.slice(0, 40),
        usage: result.usage,
      });
      setTestResult('success');
      showToast.success('Success', 'Connection test passed', insets.top + 8);
    } catch (error) {
      // The SDK wraps transport failures, so the useful detail is usually in
      // `cause` rather than the top-level message.
      const err = error as any;
      console.error('[ai-test] failed', {
        ms: Date.now() - started,
        name: err?.name,
        message: err?.message,
        statusCode: err?.statusCode,
        url: err?.url,
        responseBody: typeof err?.responseBody === 'string' ? err.responseBody.slice(0, 300) : undefined,
        cause: err?.cause?.message ?? err?.cause,
      });
      setTestResult('error');
      showToast.error(
        'Failed',
        error instanceof Error ? error.message : 'Connection test failed',
        insets.top + 8,
      );
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <View className="flex-1 bg-background-0">
      <AppBar title="AI Assistant" showBack />
      <ScrollView className="flex-1">
        <VStack className="px-5 pb-8 pt-4" space="sm">
          {/*
            Label sits flush with the other field labels and the control is a
            full-width box, matching FormInput's rhythm. Wrapping these in a
            padded card stacked its padding on top of the control's own, pushing
            the text in by another 16px.
          */}
          <View className="mb-2.5">
            <Text className="mb-1 text-sm font-medium text-typography-600">Provider</Text>
            <OptionSelector
              value={type}
              onChange={(next) => {
                setType(next);
                // Drop any endpoint from the previous selection rather than
                // carrying it into a provider whose field is hidden.
                if (!requiresEndpoint(next)) setEndpointUrl('');
                // A model id is provider-specific — keeping one across a switch
                // just produces a confusing 404 on the next request.
                setModelName('');
                setCustomModel(false);
                setTestResult(null);
              }}
              options={PROVIDER_ORDER.map((key) => ({
                value: key,
                label: PROVIDER_LABELS[key],
                icon: <ProviderLogo type={key} />,
                description:
                  key === 'openai-compatible'
                    ? 'Ollama, LM Studio, OpenRouter, or any custom endpoint'
                    : undefined,
              }))}
              title="Provider"
              showSearch
            />
          </View>

          {needsEndpoint && (
            <FormInput
              title="Endpoint URL"
              placeholder="http://localhost:11434/v1"
              value={endpointUrl}
              onChangeText={setEndpointUrl}
              autoCapitalize="none"
              autoCorrect={false}
            />
          )}

          <FormInput
            title="API Key"
            placeholder="sk-..."
            value={apiKey}
            onChangeText={setApiKey}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />

          {/*
            One control for the model: pick from the catalogue, or drop to a
            text field via the trailing Custom entry. The catalogue only knows
            models that existed at build time, so typing one must stay possible.
          */}
          <View className="mb-2.5">
            <HStack className="mb-1 items-center justify-between">
              <Text className="text-sm font-medium text-typography-600">Model</Text>
              {catalogModels.length > 0 && (
                <Pressable onPress={handleRefreshCatalog} disabled={isRefreshingCatalog}>
                  <HStack className="items-center" space="xs">
                    {isRefreshingCatalog ? (
                      <ActivityIndicator size="small" />
                    ) : (
                      <Icon as={RefreshCw} size="xs" className="text-primary-500" />
                    )}
                    <Text className="text-sm text-primary-500">Refresh</Text>
                  </HStack>
                </Pressable>
              )}
            </HStack>

            <OptionSelector
              value={isCustomModel ? CUSTOM_MODEL : modelName}
              onChange={(next) => {
                if (next === CUSTOM_MODEL) {
                  setCustomModel(true);
                  setModelName('');
                } else {
                  setCustomModel(false);
                  setModelName(next);
                }
              }}
              options={[
                ...catalogModels.map((model) => ({
                  value: model.id,
                  label: model.name,
                  description: [
                    model.id,
                    model.context ? `${Math.round(model.context / 1000)}k ctx` : null,
                    model.reasoning ? 'reasoning' : null,
                  ]
                    .filter(Boolean)
                    .join(' · '),
                })),
                {
                  value: CUSTOM_MODEL,
                  label: 'Custom…',
                  description: 'Enter a model id manually',
                },
              ]}
              title="Select a model"
              showSearch={catalogModels.length > 8}
            />

            {isCustomModel && (
              <View className="mt-2">
                <FormInput
                  placeholder={PROVIDER_MODEL_HINTS[type]}
                  value={modelName}
                  onChangeText={setModelName}
                  autoCapitalize="none"
                  autoCorrect={false}
                  containerStyle={{ marginBottom: 0 }}
                />
              </View>
            )}

            {catalogModels.length > 0 && (
              <Text className="mt-1 text-xs text-typography-400">
                {catalogModels.length} tool-capable models as of {getCatalogDate()}.
              </Text>
            )}
          </View>

          <View className="rounded-xl bg-background-50 p-3">
            {/* NumberSlider renders the value itself; a second copy in the
                header just showed 0.7 twice. */}
            <Text className="mb-2 text-sm font-medium text-typography-600">Temperature</Text>
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
                  <Icon as={Pencil} size="xs" className="text-primary-500" />
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
                <Icon as={X} size="md" className="text-typography-500" />
              </Pressable>
              <Text className="text-base font-semibold text-typography-900">Custom Prompt</Text>
              <Pressable onPress={handleSavePrompt}>
                <Text className="text-sm font-medium text-primary-500">Save</Text>
              </Pressable>
            </HStack>

            <Text className="text-xs text-typography-500">
              Custom instructions injected into the AI system prompt. Use this to guide the AI&apos;s style, language, or focus.
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
