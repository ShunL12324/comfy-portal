import { BottomSheetTextarea } from '@/components/self-ui/bottom-sheet-textarea';
import { Button, ButtonIcon, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { RotatingSpinner } from '@/components/ui/rotating-spinner';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { VStack } from '@/components/ui/vstack';
import { ChatMessage, ConversationMessage } from '@/features/ai-assistant/types';
import { AIService } from '@/services/ai-service';
import {
  AlertTriangle,
  Check,
  ChevronDown,
  RefreshCw,
  Send,
  Settings,
  Sparkles,
  X,
} from 'lucide-react-native';
import { MotiView } from 'moti';
import React, { useCallback, useState } from 'react';
import { useAIAssistantStore } from '../../stores/ai-assistant-store';
import { TemplateSelector } from './template-selector';

interface AIModeProps {
  initialPrompt: string;
  onAccept: (optimizedPrompt: string) => void;
  onOpenSettings: () => void;
}

type OptimizeState = 'idle' | 'loading' | 'success' | 'error';

export function AIMode({ initialPrompt, onAccept, onOpenSettings }: AIModeProps) {
  const { provider, templates, selectedTemplateId, setSelectedTemplate, isConfigured } =
    useAIAssistantStore();

  const [optimizeState, setOptimizeState] = useState<OptimizeState>('idle');
  const [optimizedPrompt, setOptimizedPrompt] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [feedback, setFeedback] = useState('');
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);
  const configured = isConfigured();
  const assistantTurnCount = conversationHistory.filter((msg) => msg.role === 'assistant').length;
  const stateLabel = {
    idle: 'Waiting',
    loading: 'Generating',
    success: 'Ready',
    error: 'Failed',
  }[optimizeState];

  const buildMessages = useCallback((): ChatMessage[] => {
    if (!selectedTemplate) return [];

    const systemPrompt = selectedTemplate.systemPrompt.replace('{{user_prompt}}', initialPrompt);
    const messages: ChatMessage[] = [{ role: 'system', content: systemPrompt }];

    for (const msg of conversationHistory) {
      messages.push({ role: msg.role, content: msg.content });
    }

    return messages;
  }, [selectedTemplate, initialPrompt, conversationHistory]);

  const handleOptimize = useCallback(async () => {
    if (!provider || !selectedTemplate) return;

    setOptimizeState('loading');
    setErrorMessage('');

    try {
      const aiService = new AIService({
        endpointUrl: provider.endpointUrl,
        apiKey: provider.apiKey,
        modelName: provider.modelName,
      });

      const messages = buildMessages();

      if (conversationHistory.length === 0) {
        messages.push({ role: 'user', content: 'Please optimize this prompt.' });
      }

      const result = await aiService.chatCompletion({
        messages,
        temperature: provider.temperature,
      });

      setOptimizedPrompt(result);
      setOptimizeState('success');

      if (conversationHistory.length === 0) {
        setConversationHistory([
          { role: 'user', content: 'Please optimize this prompt.' },
          { role: 'assistant', content: result },
        ]);
      } else {
        setConversationHistory((prev) => [...prev, { role: 'assistant', content: result }]);
      }
    } catch (error) {
      setOptimizeState('error');
      setErrorMessage(error instanceof Error ? error.message : 'Optimization failed');
    }
  }, [provider, selectedTemplate, buildMessages, conversationHistory]);

  const handleRefinement = useCallback(async () => {
    if (!feedback.trim() || !provider) return;

    setOptimizeState('loading');
    setErrorMessage('');

    setConversationHistory((prev) => [...prev, { role: 'user', content: feedback }]);
    setFeedback('');

    try {
      const aiService = new AIService({
        endpointUrl: provider.endpointUrl,
        apiKey: provider.apiKey,
        modelName: provider.modelName,
      });

      const messages = buildMessages();
      messages.push({ role: 'user', content: feedback });

      const result = await aiService.chatCompletion({
        messages,
        temperature: provider.temperature,
      });

      setOptimizedPrompt(result);
      setOptimizeState('success');

      setConversationHistory((prev) => [...prev, { role: 'assistant', content: result }]);
    } catch (error) {
      setOptimizeState('error');
      setErrorMessage(error instanceof Error ? error.message : 'Refinement failed');
    }
  }, [feedback, provider, buildMessages]);

  const handleAccept = useCallback(() => {
    onAccept(optimizedPrompt);
    setOptimizeState('idle');
    setOptimizedPrompt('');
    setConversationHistory([]);
    setFeedback('');
  }, [optimizedPrompt, onAccept]);

  const handleReject = useCallback(() => {
    setOptimizeState('idle');
    setOptimizedPrompt('');
    setConversationHistory([]);
    setFeedback('');
    setErrorMessage('');
  }, []);

  const handleTemplateSelect = useCallback(
    (templateId: string) => {
      setSelectedTemplate(templateId);
      setShowTemplateSelector(false);
      if (optimizeState !== 'idle') {
        handleReject();
      }
    },
    [setSelectedTemplate, optimizeState, handleReject],
  );

  if (!configured) {
    return (
      <View className="flex-1 items-center justify-center py-8">
        <View className="w-full rounded-2xl bg-warning-50 px-5 py-6">
          <View className="items-center">
            <View className="mb-3 rounded-full bg-warning-100 p-2">
              <Icon as={AlertTriangle} size="md" className="text-warning-600" />
            </View>
            <Text className="text-center text-base font-semibold text-typography-900">AI Not Configured</Text>
            <Text className="mt-1 text-center text-sm text-typography-600">
              Configure your provider first to use prompt optimization.
            </Text>
            <Button variant="solid" action="primary" onPress={onOpenSettings} className="mt-5 rounded-xl px-4">
              <ButtonIcon as={Settings} />
              <ButtonText>Open Settings</ButtonText>
            </Button>
          </View>
        </View>
      </View>
    );
  }

  return (
    <VStack className="flex-1" space="lg">
      <VStack space="sm">
        <HStack className="items-center justify-between">
          <View>
            <Text className="text-sm font-semibold text-typography-900">Step 1 · Current Prompt</Text>
          </View>
          <View className="rounded-full bg-background-0 px-2.5 py-1">
            <Text className="text-xs font-medium text-typography-500">{initialPrompt.trim().length} chars</Text>
          </View>
        </HStack>

        <View className="rounded-2xl bg-background-50 px-3 py-3">
          <Text className="text-sm leading-5 text-typography-700">{initialPrompt || '(Empty prompt)'}</Text>
        </View>

        <Text className="text-xs font-medium uppercase tracking-wide text-typography-500">Template</Text>
        <HStack className="items-center" space="sm">
          <Pressable
            onPress={() => setShowTemplateSelector(!showTemplateSelector)}
            className="flex-1 flex-row items-center justify-between rounded-xl bg-background-0 px-3 py-2.5"
          >
            <Text className="text-sm text-typography-900" numberOfLines={1}>
              {selectedTemplate?.name || 'Select template'}
            </Text>
            <Icon as={ChevronDown} size="sm" className="text-typography-500" />
          </Pressable>

          <Button
            variant="solid"
            action="primary"
            size="sm"
            onPress={handleOptimize}
            disabled={optimizeState === 'loading' || !selectedTemplate}
            className="rounded-xl px-3"
          >
            {optimizeState === 'loading' ? <RotatingSpinner size="sm" /> : <ButtonIcon as={Sparkles} />}
            <ButtonText>{assistantTurnCount > 0 ? 'Regenerate' : 'Optimize'}</ButtonText>
          </Button>
        </HStack>
      </VStack>

      {showTemplateSelector && (
        <TemplateSelector
          templates={templates}
          selectedTemplateId={selectedTemplateId}
          onSelect={handleTemplateSelect}
          onClose={() => setShowTemplateSelector(false)}
        />
      )}

      <MotiView
        from={{ opacity: 0, translateY: 8 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 220 }}
      >
        <VStack space="sm">
          <HStack className="items-center justify-between">
            <View>
              <Text className="text-sm font-semibold text-typography-900">Step 2 · AI Result</Text>
            </View>
            <Text className="text-xs font-medium text-typography-500">{stateLabel}</Text>
          </HStack>

          {optimizeState === 'idle' && (
            <View className="mt-3 rounded-xl bg-background-50 px-4 py-6">
              <Text className="text-center text-sm font-medium text-typography-700">No draft yet</Text>
            </View>
          )}

          {optimizeState === 'loading' && (
            <View className="mt-3 items-center rounded-xl bg-background-50 py-7">
              <RotatingSpinner size="md" />
              <Text className="mt-2 text-sm font-medium text-typography-700">Optimizing prompt</Text>
              <Text className="mt-1 text-xs text-typography-500">This can take a few seconds.</Text>
            </View>
          )}

          {optimizeState === 'error' && (
            <View className="mt-3 rounded-xl bg-error-50 px-3 py-3">
              <HStack className="items-start" space="sm">
                <Icon as={AlertTriangle} size="sm" className="mt-0.5 text-error-600" />
                <View className="flex-1">
                  <Text className="text-sm font-medium text-error-700">Optimization failed</Text>
                  <Text className="mt-0.5 text-sm text-error-700">{errorMessage}</Text>
                </View>
              </HStack>
              <Button variant="link" size="sm" onPress={handleOptimize} className="mt-3 self-start rounded-lg">
                <ButtonIcon as={RefreshCw} />
                <ButtonText>Retry</ButtonText>
              </Button>
            </View>
          )}

          {optimizeState === 'success' && (
            <VStack space="md">
              <View className="rounded-xl bg-success-50 px-3 py-3">
                <Text className="text-sm leading-5 text-typography-900">{optimizedPrompt}</Text>
              </View>

              <HStack className="items-center" space="sm">
                <Button variant="solid" action="positive" size="sm" onPress={handleAccept} className="flex-1 rounded-xl">
                  <ButtonIcon as={Check} />
                  <ButtonText>Accept</ButtonText>
                </Button>
                <Button variant="link" action="negative" size="sm" onPress={handleReject} className="flex-1 rounded-xl">
                  <ButtonIcon as={X} />
                  <ButtonText>Discard</ButtonText>
                </Button>
              </HStack>

              <View className="rounded-xl bg-background-50 p-3">
                <Text className="mb-2 text-xs font-medium uppercase tracking-wide text-typography-500">Refine</Text>
                <HStack className="items-end" space="sm">
                  <View className="flex-1">
                    <BottomSheetTextarea
                      placeholder="Tell AI what to adjust..."
                      value={feedback}
                      onChangeText={setFeedback}
                      minHeight={56}
                    />
                  </View>
                  <Button
                    variant="solid"
                    action="primary"
                    size="sm"
                    onPress={handleRefinement}
                    disabled={!feedback.trim()}
                    className="rounded-xl px-3"
                  >
                    <ButtonIcon as={Send} />
                  </Button>
                </HStack>
              </View>
            </VStack>
          )}
        </VStack>
      </MotiView>
    </VStack>
  );
}
