import { AppBar } from '@/components/layout/app-bar';
import { FormInput } from '@/components/self-ui/form-input';
import { Button, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { ScrollView } from '@/components/ui/scroll-view';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { VStack } from '@/components/ui/vstack';
import { useCloudCredentialsStore } from '@/features/cloud/stores/credentials-store';
import { isSecureStorageAvailable } from '@/services/secure-store';
import { verifyApiKey } from '@/services/vast';
import { showToast } from '@/utils/toast';
import { Link } from 'expo-router';
import { CheckCircle2, ChevronRight, Server, ShieldAlert, XCircle } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type TestState = 'idle' | 'testing' | 'ok' | 'failed';

export default function CloudGpuSettings() {
  const insets = useSafeAreaInsets();
  const { vastApiKey, civitaiApiKey, huggingFaceToken, hydrated, setCredential } =
    useCloudCredentialsStore();

  // Local drafts so typing doesn't write a half-entered key to the keychain on
  // every keystroke.
  const [vastDraft, setVastDraft] = useState('');
  const [civitaiDraft, setCivitaiDraft] = useState('');
  const [hfDraft, setHfDraft] = useState('');
  const [testState, setTestState] = useState<TestState>('idle');
  const [testDetail, setTestDetail] = useState('');
  const [keychainAvailable, setKeychainAvailable] = useState(true);

  useEffect(() => {
    if (!hydrated) return;
    setVastDraft(vastApiKey);
    setCivitaiDraft(civitaiApiKey);
    setHfDraft(huggingFaceToken);
  }, [hydrated, vastApiKey, civitaiApiKey, huggingFaceToken]);

  useEffect(() => {
    void isSecureStorageAvailable().then(setKeychainAvailable);
  }, []);

  const handleSave = () => {
    setCredential('vastApiKey', vastDraft);
    setCredential('civitaiApiKey', civitaiDraft);
    setCredential('huggingFaceToken', hfDraft);
    showToast.success('Saved', 'Credentials stored', insets.top + 8);
  };

  const handleTestVast = async () => {
    if (!vastDraft.trim()) {
      showToast.error('Error', 'Enter a vast.ai API key first', insets.top + 8);
      return;
    }
    setTestState('testing');
    setTestDetail('');
    try {
      const { email, balance } = await verifyApiKey(vastDraft.trim());
      setTestState('ok');
      // Balance is the number that matters before renting anything.
      setTestDetail(
        [email, balance != null ? `$${balance.toFixed(2)} credit` : null].filter(Boolean).join(' · '),
      );
    } catch (error) {
      setTestState('failed');
      setTestDetail(error instanceof Error ? error.message : 'Connection failed');
    }
  };

  return (
    <View className="flex-1 bg-background-0">
      <AppBar title="Cloud GPU" showBack />
      <ScrollView className="flex-1">
        <VStack className="px-5 pb-8 pt-4" space="sm">
          {!keychainAvailable && (
            <HStack space="sm" className="mb-2 items-start rounded-xl bg-background-50 p-3">
              <Icon as={ShieldAlert} size="sm" className="mt-0.5 text-warning-500" />
              <Text className="flex-1 text-xs text-typography-500">
                This platform has no keychain, so keys are stored unencrypted. Prefer entering
                them on a phone.
              </Text>
            </HStack>
          )}

          <Text className="mb-1 text-sm font-medium text-typography-600">vast.ai</Text>
          <FormInput
            title="API Key"
            defaultValue={vastDraft}
            onChangeText={setVastDraft}
            placeholder="Paste your vast.ai API key"
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Text className="-mt-1 mb-1 text-xs text-typography-400">
            Rents and destroys GPU instances — it can spend money on your account.
          </Text>

          <HStack space="sm" className="items-center">
            <Button
              variant="outline"
              size="sm"
              onPress={handleTestVast}
              isDisabled={testState === 'testing'}
              className="rounded-lg"
            >
              {testState === 'testing' ? (
                <Spinner size="small" />
              ) : (
                <ButtonText className="text-xs">Test connection</ButtonText>
              )}
            </Button>
            {testState === 'ok' && (
              <HStack space="xs" className="flex-1 items-center">
                <Icon as={CheckCircle2} size="xs" className="text-success-500" />
                <Text className="flex-1 text-xs text-typography-500" numberOfLines={1}>
                  {testDetail || 'Key is valid'}
                </Text>
              </HStack>
            )}
            {testState === 'failed' && (
              <HStack space="xs" className="flex-1 items-center">
                <Icon as={XCircle} size="xs" className="text-error-500" />
                <Text className="flex-1 text-xs text-error-500" numberOfLines={2}>
                  {testDetail}
                </Text>
              </HStack>
            )}
          </HStack>

          <View className="my-3 h-px bg-background-100" />

          <Text className="mb-1 text-sm font-medium text-typography-600">Model downloads</Text>
          <Text className="-mt-1 mb-2 text-xs text-typography-400">
            Passed to the instance so gated models resolve. Leave blank if you only use public
            models.
          </Text>
          <FormInput
            title="CivitAI API Key"
            defaultValue={civitaiDraft}
            onChangeText={setCivitaiDraft}
            placeholder="Optional"
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />
          <FormInput
            title="HuggingFace Token"
            defaultValue={hfDraft}
            onChangeText={setHfDraft}
            placeholder="Optional"
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Button onPress={handleSave} className="mt-3 rounded-lg bg-primary-500">
            <ButtonText>Save</ButtonText>
          </Button>

          <View className="my-3 h-px bg-background-100" />

          <Link href="/settings/cloud-gpu/instances" asChild>
            <Pressable className="py-3">
              <HStack className="items-center justify-between">
                <HStack space="sm" className="items-center">
                  <Icon as={Server} size="md" className="text-primary-500" />
                  <VStack>
                    <Text className="text-base font-medium text-typography-900">Instances</Text>
                    <Text className="text-xs text-typography-400">
                      Everything running on your vast.ai account
                    </Text>
                  </VStack>
                </HStack>
                <Icon as={ChevronRight} size="sm" className="text-typography-400" />
              </HStack>
            </Pressable>
          </Link>
        </VStack>
      </ScrollView>
    </View>
  );
}
