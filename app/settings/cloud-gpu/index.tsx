import { AppBar } from '@/components/layout/app-bar';
import { BottomSheetProvider } from '@/context/bottom-sheet-context';
import { Button, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { ScrollView } from '@/components/ui/scroll-view';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { VStack } from '@/components/ui/vstack';
import { CredentialField } from '@/features/cloud/components/credential-field';
import { useCloudCredentialsStore } from '@/features/cloud/stores/credentials-store';
import { CLOUD_GPU_SUPPORTED, CLOUD_GPU_UNSUPPORTED_REASON } from '@/features/cloud/utils/availability';
import { verifyCivitaiKey, verifyHuggingFaceToken } from '@/services/model-hosts';
import { isSecureStorageAvailable } from '@/services/secure-store';
import { verifyApiKey } from '@/services/vast';
import { showToast } from '@/utils/toast';
import { Link } from 'expo-router';
import { ChevronRight, CloudOff, LayoutTemplate, Server, ShieldAlert } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function CloudGpuSettings() {
  const insets = useSafeAreaInsets();
  const { vastApiKey, civitaiApiKey, huggingFaceToken, hydrated, setCredential } = useCloudCredentialsStore();

  // Local drafts so typing doesn't write a half-entered key to the keychain on
  // every keystroke.
  const [vastDraft, setVastDraft] = useState('');
  const [civitaiDraft, setCivitaiDraft] = useState('');
  const [hfDraft, setHfDraft] = useState('');
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

  if (!CLOUD_GPU_SUPPORTED) {
    return (
      <View className="bg-background-0 flex-1">
        <AppBar title="Cloud GPU" showBack />
        <VStack space="md" className="px-8 py-16 items-center">
          <Icon as={CloudOff} className="h-8 w-8 text-typography-300" />
          <Text className="text-sm text-typography-400 text-center">{CLOUD_GPU_UNSUPPORTED_REASON}</Text>
        </VStack>
      </View>
    );
  }

  return (
    <View className="bg-background-0 flex-1">
      <AppBar title="Cloud GPU" showBack />
      {/* These inputs go through AdaptiveTextInput, and BottomSheetContext
          defaults to true — so on a plain screen they'd render the BottomSheet
          variant and reach for a sheet that isn't there. */}
      <BottomSheetProvider isInSheet={false}>
        <ScrollView className="flex-1">
          <VStack className="px-5 pb-8 pt-4" space="md">
            {!keychainAvailable && (
              <HStack space="sm" className="rounded-xl bg-background-50 p-3 items-start">
                <Icon as={ShieldAlert} size="sm" className="mt-0.5 text-warning-500" />
                <Text className="text-xs text-typography-500 flex-1">
                  This platform has no keychain, so keys are stored unencrypted. Prefer entering them on a phone.
                </Text>
              </HStack>
            )}

            <Text className="text-sm font-medium text-typography-600">GPU provider</Text>
            <CredentialField
              title="vast.ai API Key"
              value={vastDraft}
              onChangeText={setVastDraft}
              placeholder="Paste your vast.ai API key"
              hint="Rents and destroys GPU instances — it can spend money on your account."
              onTest={async (key) => {
                const { email, balance } = await verifyApiKey(key);
                // Credit is the number that matters before renting anything.
                return (
                  [email, balance != null ? `$${balance.toFixed(2)} credit` : null].filter(Boolean).join(' · ') ||
                  'Key is valid'
                );
              }}
            />

            <View className="my-1 bg-background-100 h-px" />

            <VStack space="xs">
              <Text className="text-sm font-medium text-typography-600">Model downloads</Text>
              <Text className="text-xs text-typography-400">
                Passed to the instance so gated models resolve. Leave blank if you only use public models.
              </Text>
            </VStack>

            <CredentialField
              title="CivitAI API Key"
              value={civitaiDraft}
              onChangeText={setCivitaiDraft}
              placeholder="Optional"
              onTest={async (key) => {
                const { username } = await verifyCivitaiKey(key);
                return username ? `Signed in as ${username}` : 'Key is valid';
              }}
            />

            <CredentialField
              title="HuggingFace Token"
              value={hfDraft}
              onChangeText={setHfDraft}
              placeholder="Optional"
              onTest={async (token) => {
                const { name, role } = await verifyHuggingFaceToken(token);
                return [name, role && `${role} access`].filter(Boolean).join(' · ') || 'Token is valid';
              }}
            />

            <Button onPress={handleSave} className="mt-2 rounded-lg bg-primary-500">
              <ButtonText>Save</ButtonText>
            </Button>

            <View className="my-1 bg-background-100 h-px" />

            <Link href="/settings/cloud-gpu/templates" asChild>
              <Pressable className="py-2">
                <HStack className="items-center justify-between">
                  <HStack space="sm" className="items-center">
                    <Icon as={LayoutTemplate} size="md" className="text-primary-500" />
                    <VStack>
                      <Text className="text-base font-medium text-typography-900">Templates</Text>
                      <Text className="text-xs text-typography-400">What to install on a fresh instance</Text>
                    </VStack>
                  </HStack>
                  <Icon as={ChevronRight} size="sm" className="text-typography-400" />
                </HStack>
              </Pressable>
            </Link>

            <Link href="/settings/cloud-gpu/instances" asChild>
              <Pressable className="py-2">
                <HStack className="items-center justify-between">
                  <HStack space="sm" className="items-center">
                    <Icon as={Server} size="md" className="text-primary-500" />
                    <VStack>
                      <Text className="text-base font-medium text-typography-900">Instances</Text>
                      <Text className="text-xs text-typography-400">Everything running on your vast.ai account</Text>
                    </VStack>
                  </HStack>
                  <Icon as={ChevronRight} size="sm" className="text-typography-400" />
                </HStack>
              </Pressable>
            </Link>
          </VStack>
        </ScrollView>
      </BottomSheetProvider>
    </View>
  );
}
