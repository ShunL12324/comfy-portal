import { FormInput } from '@/components/self-ui/form-input';
import { Button, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { CheckCircle2, XCircle } from 'lucide-react-native';
import React, { useState } from 'react';

type TestState = 'idle' | 'testing' | 'ok' | 'failed';

interface CredentialFieldProps {
  title: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  /** One line under the field explaining what the key is for. */
  hint?: string;
  /** Resolves with a short description of the account to show on success. */
  onTest: (value: string) => Promise<string>;
}

/**
 * A secret input with its own test button and result.
 *
 * Each credential verifies against a different service, so the state has to be
 * per-field — one shared result would claim the vast key was fine because the
 * HuggingFace one was.
 */
export function CredentialField({
  title,
  value,
  onChangeText,
  placeholder,
  hint,
  onTest,
}: CredentialFieldProps) {
  const [state, setState] = useState<TestState>('idle');
  const [detail, setDetail] = useState('');

  const runTest = async () => {
    if (!value.trim()) return;
    setState('testing');
    setDetail('');
    try {
      setDetail(await onTest(value.trim()));
      setState('ok');
    } catch (error) {
      setDetail(error instanceof Error ? error.message : 'Connection failed');
      setState('failed');
    }
  };

  return (
    <VStack space="xs">
      <FormInput
        title={title}
        defaultValue={value}
        onChangeText={(next: string) => {
          onChangeText(next);
          // A previous verdict says nothing about the key being typed now.
          if (state !== 'idle') {
            setState('idle');
            setDetail('');
          }
        }}
        placeholder={placeholder}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
      />

      {hint ? <Text className="-mt-1 text-xs text-typography-400">{hint}</Text> : null}

      <HStack space="sm" className="items-center">
        <Button
          variant="outline"
          size="sm"
          onPress={runTest}
          isDisabled={state === 'testing' || !value.trim()}
          // Fixed width: swapping the label for a spinner otherwise resizes the
          // button mid-request and shifts everything beside it.
          style={{ width: 108 }}
          className="rounded-lg"
        >
          {state === 'testing' ? (
            <Spinner size="small" />
          ) : (
            <ButtonText className="text-xs">Test</ButtonText>
          )}
        </Button>

        {state === 'ok' && (
          <HStack space="xs" className="flex-1 items-center">
            <Icon as={CheckCircle2} size="xs" className="text-success-500" />
            <Text className="flex-1 text-xs text-typography-500" numberOfLines={1}>
              {detail}
            </Text>
          </HStack>
        )}
        {state === 'failed' && (
          <HStack space="xs" className="flex-1 items-center">
            <Icon as={XCircle} size="xs" className="text-error-500" />
            <Text className="flex-1 text-xs text-error-500" numberOfLines={2}>
              {detail}
            </Text>
          </HStack>
        )}
      </HStack>
    </VStack>
  );
}
