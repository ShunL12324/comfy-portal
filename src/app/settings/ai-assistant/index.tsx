import { OptionSelector } from '@/components/common/selectors/option-selector';
import { AppBar } from '@/components/layout/app-bar';
import { AdaptiveScrollView } from '@/components/self-ui/adaptive-sheet-components';
import { FormInput } from '@/components/self-ui/form-input';
import { NumberSlider } from '@/components/self-ui/slider';
import { ThemedBottomSheetModal } from '@/components/self-ui/themed-bottom-sheet-modal';
import { Title, Action, ActionRow, Copy, FieldLabel, useDesign } from '@/components/ui/design-system/primitives';
import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import { ScrollView } from '@/components/ui/scroll-view';
import { Textarea, TextareaInput } from '@/components/ui/textarea';
import { View } from '@/components/ui/view';
import { VStack } from '@/components/ui/vstack';
import { ProviderLogo } from '@/features/ai-assistant/components/provider-logo';
import {
  PROVIDER_LABELS,
  PROVIDER_MODEL_HINTS,
  PROVIDER_ORDER,
  createLanguageModel,
  requiresEndpoint,
} from '@/features/ai-assistant/model';
import { getCatalogDate, getCatalogModels, refreshCatalog } from '@/features/ai-assistant/model-catalog';
import { useAIAssistantStore } from '@/features/ai-assistant/stores/ai-assistant-store';
import type { AIProviderType } from '@/features/ai-assistant/types';
import { showToast } from '@/utils/toast';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { generateText } from 'ai';
import { CircleCheck, CircleX, Pencil } from '@/constants/icons';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Keyboard } from 'react-native';
import { designTokens as t } from '@/constants/design-tokens';

/**
 * Sentinel for the trailing "Custom…" row. Prefixed so it can never collide
 * with a real model id.
 */
const CUSTOM_MODEL = '__custom__';

export default function AIAssistantScreen() {
  const c = useDesign();
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
      showToast.success('Updated', `${count} models available`);
    } catch (error) {
      showToast.error('Failed', error instanceof Error ? error.message : 'Could not reach models.dev');
    } finally {
      setIsRefreshingCatalog(false);
    }
  }, []);

  // A saved model id that isn't in the catalogue means the user typed it (or
  // the catalogue has moved on), so the custom field opens on its own.
  const [customModel, setCustomModel] = useState(false);
  const isCustomModel = customModel || Boolean(modelName && !catalogModels.some((m) => m.id === modelName));

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
    showToast.success('Saved', 'Custom prompt saved');
  }, [draftPrompt, setCustomPrompt]);

  const handleSaveProvider = () => {
    if (!isComplete) {
      showToast.error('Error', 'Please fill in all required fields');
      return;
    }

    setProvider(draftProvider());
    showToast.success('Saved', 'API configuration saved');
  };

  const handleTestConnection = async () => {
    if (!isComplete) {
      showToast.error('Error', 'Please fill in all required fields');
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    const draft = draftProvider();
    try {
      // No output cap: a reasoning model would otherwise spend the whole budget
      // on reasoning tokens and return empty content, failing a valid config.
      await generateText({
        model: createLanguageModel({ id: 'test', ...draft }),
        prompt: 'Reply with OK.',
      });
      setTestResult('success');
      showToast.success('Success', 'Connection test passed');
    } catch (error) {
      setTestResult('error');
      showToast.error('Failed', error instanceof Error ? error.message : 'Connection test failed');
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <View className="bg-surface-base flex-1">
      <AppBar title="AI Assistant" showBack />
      <ScrollView className="flex-1">
        <VStack className="px-5 pb-8 pt-2" space="md">
          {/*
            Label sits flush with the other field labels and the control is a
            full-width box, matching FormInput's rhythm. Wrapping these in a
            padded card stacked its padding on top of the control's own, pushing
            the text in by another 16px.
          */}
          <View className="mb-2.5">
            <View className="mb-1">
              <FieldLabel>Provider</FieldLabel>
            </View>
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
                  key === 'openai-compatible' ? 'Ollama, LM Studio, OpenRouter, or any custom endpoint' : undefined,
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
            <View className="mb-1">
              <FieldLabel>Model</FieldLabel>
            </View>

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
              onRefresh={handleRefreshCatalog}
              isRefreshing={isRefreshingCatalog}
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
              <Copy size="label" muted className="mt-1">
                {catalogModels.length} tool-capable models as of {getCatalogDate()}.
              </Copy>
            )}
          </View>

          <View className="p-3 rounded-xl" style={{ backgroundColor: c.card }}>
            {/* NumberSlider renders the value itself; a second copy in the
                header just showed 0.7 twice. */}
            <View className="mb-1">
              <FieldLabel>Temperature</FieldLabel>
            </View>
            <NumberSlider
              value={temperature}
              minValue={0}
              maxValue={2}
              step={0.1}
              onChange={setTemperature}
              showButtons={false}
            />
          </View>

          <View className="p-3 rounded-xl" style={{ backgroundColor: c.card }}>
            <HStack className="mb-2 items-center justify-between">
              <FieldLabel>Custom Prompt</FieldLabel>
              {/* Full touch target without growing the header row; flush with the card's right edge. */}
              <View
                style={{
                  marginVertical: -(t.height.touch - t.leading.label) / 2,
                  marginRight: -t.layout.related,
                }}
              >
                <Action kind="text" small icon={Pencil} label="Edit custom prompt" onPress={handleOpenPromptSheet}>
                  Edit
                </Action>
              </View>
            </HStack>
            <Pressable onPress={handleOpenPromptSheet}>
              <Copy style={{ color: c.secondary }} numberOfLines={3}>
                {customPrompt || 'Tap to add custom instructions that will be injected into the system prompt...'}
              </Copy>
            </Pressable>
          </View>

          <View className="mt-2">
            <ActionRow>
              <Action
                fill
                kind="secondary"
                loading={isTesting}
                disabled={!isComplete}
                icon={testResult === 'success' ? CircleCheck : testResult === 'error' ? CircleX : undefined}
                onPress={handleTestConnection}
              >
                Test connection
              </Action>
              <Action fill kind="primary" disabled={!isComplete} onPress={handleSaveProvider}>
                Save provider
              </Action>
            </ActionRow>
          </View>
        </VStack>
      </ScrollView>

      <ThemedBottomSheetModal ref={promptSheetRef} snapPoints={snapPoints} enableDynamicSizing={false}>
        <AdaptiveScrollView>
          <VStack className="px-5 pb-8" space="md">
            <HStack className="items-center justify-between">
              <Title compact>Custom Prompt</Title>
              <Pressable onPress={handleSavePrompt}>
                <Copy style={{ fontWeight: '500' }}>Save</Copy>
              </Pressable>
            </HStack>

            <Copy size="label" style={{ color: c.secondary }}>
              Custom instructions injected into the AI system prompt. Use this to guide the AI&apos;s style, language,
              or focus.
            </Copy>

            <Textarea
              size="sm"
              className="bg-well w-full border-0"
              style={{ borderRadius: t.radius.control, height: 200 }}
            >
              <TextareaInput
                aria-label="Custom Prompt"
                placeholder="e.g. Always use anime style, prefer warm lighting, output in Japanese..."
                value={draftPrompt}
                onChangeText={setDraftPrompt}
                style={{ paddingHorizontal: t.layout.rowX, paddingVertical: t.layout.rowY }}
              />
            </Textarea>
          </VStack>
        </AdaptiveScrollView>
      </ThemedBottomSheetModal>
    </View>
  );
}
