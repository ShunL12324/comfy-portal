import { FormInput } from '@/components/self-ui/form-input';
import { Action, Copy, useDesign } from '@/components/ui/design-system/primitives';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { VStack } from '@/components/ui/vstack';
import { CheckCircle2, XCircle } from '@/constants/icons';
import { useEffect, useRef, useState } from 'react';

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
export function CredentialField({ title, value, onChangeText, placeholder, hint, onTest }: CredentialFieldProps) {
  const c = useDesign();
  const [state, setState] = useState<TestState>('idle');
  const [detail, setDetail] = useState('');
  const [testedValue, setTestedValue] = useState('');
  const visibleState = testedValue === value ? state : 'idle';
  const attempt = useRef(0);
  useEffect(() => {
    attempt.current += 1;
  }, [value]);
  useEffect(
    () => () => {
      attempt.current += 1;
    },
    [],
  );

  const runTest = async () => {
    if (!value.trim()) return;
    const current = ++attempt.current;
    setTestedValue(value);
    setState('testing');
    setDetail('');
    try {
      const result = await onTest(value.trim());
      if (current !== attempt.current) return;
      setDetail(result);
      setState('ok');
    } catch (error) {
      if (current !== attempt.current) return;
      setDetail(error instanceof Error ? error.message : 'Connection failed');
      setState('failed');
    }
  };

  return (
    <VStack space="xs">
      <FormInput
        title={title}
        value={value}
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

      {hint ? <Copy size="metadata" muted className="-mt-1">{hint}</Copy> : null}

      <HStack space="sm" className="items-center">
        <Action kind="secondary" small loading={visibleState === 'testing'} disabled={!value.trim()} onPress={runTest}>
          Test connection
        </Action>

        {visibleState === 'ok' && (
          <HStack space="xs" className="flex-1 items-center">
            <Icon as={CheckCircle2} size="xs" className="text-status-online" />
            <Copy size="metadata" className="flex-1" style={{ color: c.secondary }} numberOfLines={1}>
              {detail}
            </Copy>
          </HStack>
        )}
        {visibleState === 'failed' && (
          <HStack space="xs" className="flex-1 items-center">
            <Icon as={XCircle} size="xs" className="text-status-danger" />
            <Copy size="metadata" className="flex-1" style={{ color: c.danger }} numberOfLines={2}>
              {detail}
            </Copy>
          </HStack>
        )}
      </HStack>
    </VStack>
  );
}
