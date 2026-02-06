import { BottomSheetTextarea } from '@/components/self-ui/bottom-sheet-textarea';
import { Button, ButtonIcon, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
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
import { ActivityIndicator } from 'react-native';
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

  const buildMessages = useCallback((): ChatMessage[] => {
    if (!selectedTemplate) return [];

    const systemPrompt = selectedTemplate.systemPrompt.replace('{{user_prompt}}', initialPrompt);
    const messages: ChatMessage[] = [{ role: 'system', content: systemPrompt }];

    // Add conversation history for iterative refinement
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

      // If it's the first request (no history), just add "Please optimize this prompt"
      if (conversationHistory.length === 0) {
        messages.push({ role: 'user', content: 'Please optimize this prompt.' });
      }

      const result = await aiService.chatCompletion({
        messages,
        temperature: provider.temperature,
      });

      setOptimizedPrompt(result);
      setOptimizeState('success');

      // Update conversation history
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

    // Add user feedback to history
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
    // Reset state
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
      // Reset state when template changes
      if (optimizeState !== 'idle') {
        handleReject();
      }
    },
    [setSelectedTemplate, optimizeState, handleReject],
  );

  // Not configured state
  if (!configured) {
    return (
      <View className="flex-1 items-center justify-center py-8">
        <Icon as={AlertTriangle} size="xl" className="mb-4 text-warning-500" />
        <Text className="mb-2 text-center text-base font-medium text-typography-900">
          AI Not Configured
        </Text>
        <Text className="mb-4 text-center text-sm text-typography-500">
          Please configure your AI provider in settings to use this feature.
        </Text>
        <Button variant="solid" action="primary" onPress={onOpenSettings} className="rounded-lg">
          <ButtonIcon as={Settings} />
          <ButtonText>Open Settings</ButtonText>
        </Button>
      </View>
    );
  }

  return (
    <VStack className="flex-1" space="md">
      {/* Template Selector Row */}
      <HStack className="items-center justify-between">
        <HStack className="flex-1 items-center" space="sm">
          <Text className="text-sm font-medium text-typography-600">Template:</Text>
          <Pressable
            onPress={() => setShowTemplateSelector(!showTemplateSelector)}
            className="flex-1 flex-row items-center justify-between rounded-lg bg-background-50 px-3 py-2"
          >
            <Text className="text-sm text-typography-900" numberOfLines={1}>
              {selectedTemplate?.name || 'Select template'}
            </Text>
            <Icon as={ChevronDown} size="sm" className="text-typography-500" />
          </Pressable>
        </HStack>

        <Button
          variant="solid"
          action="primary"
          size="sm"
          onPress={handleOptimize}
          disabled={optimizeState === 'loading' || !selectedTemplate}
          className="ml-3 rounded-lg"
        >
          {optimizeState === 'loading' ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <ButtonIcon as={Sparkles} />
          )}
          <ButtonText>Optimize</ButtonText>
        </Button>
      </HStack>

      {/* Template Selector Dropdown */}
      {showTemplateSelector && (
        <TemplateSelector
          templates={templates}
          selectedTemplateId={selectedTemplateId}
          onSelect={handleTemplateSelect}
          onClose={() => setShowTemplateSelector(false)}
        />
      )}

      {/* Current Prompt Display */}
      <View>
        <Text className="mb-2 text-sm font-medium text-typography-600">Current Prompt</Text>
        <View className="rounded-lg bg-background-50 p-3">
          <Text className="text-sm text-typography-700">
            {initialPrompt || '(Empty prompt)'}
          </Text>
        </View>
      </View>

      {/* Result Area */}
      {optimizeState !== 'idle' && (
        <MotiView
          from={{ opacity: 0, translateY: 10 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 200 }}
        >
          <View>
            <Text className="mb-2 text-sm font-medium text-typography-600">AI Result</Text>

            {optimizeState === 'loading' && (
              <View className="items-center rounded-lg bg-background-50 py-8">
                <ActivityIndicator size="large" />
                <Text className="mt-2 text-sm text-typography-500">Optimizing...</Text>
              </View>
            )}

            {optimizeState === 'error' && (
              <View className="rounded-lg bg-error-50 p-4">
                <HStack className="items-center" space="sm">
                  <Icon as={AlertTriangle} size="sm" className="text-error-500" />
                  <Text className="flex-1 text-sm text-error-700">{errorMessage}</Text>
                </HStack>
                <Button
                  variant="outline"
                  size="sm"
                  onPress={handleOptimize}
                  className="mt-3 rounded-lg"
                >
                  <ButtonIcon as={RefreshCw} />
                  <ButtonText>Retry</ButtonText>
                </Button>
              </View>
            )}

            {optimizeState === 'success' && (
              <VStack space="md">
                <View className="rounded-lg bg-success-50 p-3">
                  <Text className="text-sm text-typography-900">{optimizedPrompt}</Text>
                </View>

                {/* Accept/Reject Buttons */}
                <HStack space="sm">
                  <Button
                    variant="solid"
                    action="positive"
                    size="sm"
                    onPress={handleAccept}
                    className="flex-1 rounded-lg"
                  >
                    <ButtonIcon as={Check} />
                    <ButtonText>Accept</ButtonText>
                  </Button>
                  <Button
                    variant="outline"
                    action="negative"
                    size="sm"
                    onPress={handleReject}
                    className="flex-1 rounded-lg"
                  >
                    <ButtonIcon as={X} />
                    <ButtonText>Reject</ButtonText>
                  </Button>
                </HStack>

                {/* Feedback Input for Iteration */}
                <View>
                  <Text className="mb-2 text-sm font-medium text-typography-600">
                    Feedback (optional)
                  </Text>
                  <HStack space="sm" className="items-end">
                    <View className="flex-1">
                      <BottomSheetTextarea
                        placeholder="Provide feedback to refine the result..."
                        value={feedback}
                        onChangeText={setFeedback}
                        minHeight={60}
                      />
                    </View>
                    <Button
                      variant="solid"
                      action="primary"
                      size="sm"
                      onPress={handleRefinement}
                      disabled={!feedback.trim()}
                      className="rounded-lg"
                    >
                      <ButtonIcon as={Send} />
                    </Button>
                  </HStack>
                </View>
              </VStack>
            )}
          </View>
        </MotiView>
      )}
    </VStack>
  );
}
