import { getRunPodBalance } from '@/services/runpod';
import { AppBar } from '@/components/layout/app-bar';
import { EmptyState } from '@/components/self-ui/empty-state';
import { Action, Copy, FieldLabel, useDesign } from '@/components/ui/design-system/primitives';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { ScrollView } from '@/components/ui/scroll-view';
import { View } from '@/components/ui/view';
import { VStack } from '@/components/ui/vstack';
import { BottomSheetProvider } from '@/context/bottom-sheet-context';
import { CredentialField } from '@/features/cloud/components/credential-field';
import { credentialStorage, useCloudCredentialsStore } from '@/features/cloud/stores/credentials-store';
import { CLOUD_GPU_SUPPORTED, CLOUD_GPU_UNSUPPORTED_REASON } from '@/features/cloud/utils/availability';
import { verifyCivitaiKey, verifyHuggingFaceToken } from '@/services/model-hosts';
import { isSecureStorageAvailable } from '@/services/secure-store';
import { verifyApiKey } from '@/services/vast';
import { showToast } from '@/utils/toast';
import { Link } from 'expo-router';
import { ChevronRight, Server, ShieldAlert } from '@/constants/icons';
import { useEffect, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function CloudGpuSettings() {
  const c = useDesign();
  const hydrated = useCloudCredentialsStore((s) => s.hydrated);
  if (CLOUD_GPU_SUPPORTED && !hydrated)
    return (
      <View className="bg-surface-base flex-1">
        <AppBar title="Cloud accounts" showBack />
        <Copy className="px-5" style={{ color: c.secondary }}>
          Loading your accounts…
        </Copy>
      </View>
    );
  return <CloudCredentialsForm />;
}
function CloudCredentialsForm() {
  const insets = useSafeAreaInsets();
  const c = useDesign();
  const { vastApiKey, runpodApiKey, civitaiApiKey, huggingFaceToken, hydrated, setCredential } =
    useCloudCredentialsStore();

  // Local drafts so typing doesn't write a half-entered key to the keychain on
  // every keystroke.
  const [vastDraft, setVastDraft] = useState(vastApiKey);
  const [runpodDraft, setRunpodDraft] = useState(runpodApiKey);
  const [civitaiDraft, setCivitaiDraft] = useState(civitaiApiKey);
  const [hfDraft, setHfDraft] = useState(huggingFaceToken);
  const [keychainAvailable, setKeychainAvailable] = useState(true);

  useEffect(() => {
    void isSecureStorageAvailable().then(setKeychainAvailable);
  }, []);

  const [saving, setSaving] = useState(false);
  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    setCredential('vastApiKey', vastDraft);
    setCredential('runpodApiKey', runpodDraft);
    setCredential('civitaiApiKey', civitaiDraft);
    setCredential('huggingFaceToken', hfDraft);
    try {
      await credentialStorage.flush();
      showToast.success('Saved', 'Credentials stored');
    } catch {
      showToast.error('Could not save', 'Secure storage is unavailable. Try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!CLOUD_GPU_SUPPORTED) {
    return (
      <View className="bg-surface-base flex-1">
        <AppBar title="Cloud accounts" showBack />
        <EmptyState>{CLOUD_GPU_UNSUPPORTED_REASON}</EmptyState>
      </View>
    );
  }

  return (
    <View className="bg-surface-base flex-1">
      <AppBar title="Cloud accounts" showBack />
      {/* These inputs go through AdaptiveTextInput, and BottomSheetContext
          defaults to true — so on a plain screen they'd render the BottomSheet
          variant and reach for a sheet that isn't there. */}
      <BottomSheetProvider isInSheet={false}>
        <ScrollView className="flex-1">
          <VStack className="px-5 pb-8 pt-2" space="md">
            {!keychainAvailable && (
              <HStack space="sm" className="p-3 items-start rounded-xl" style={{ backgroundColor: c.card }}>
                <Icon as={ShieldAlert} size="sm" className="mt-0.5 text-status-busy" />
                <Copy size="label" className="flex-1" style={{ color: c.secondary }}>
                  This platform has no keychain, so keys are stored unencrypted. Prefer entering them on a phone.
                </Copy>
              </HStack>
            )}

            <FieldLabel>GPU provider</FieldLabel>
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

            <CredentialField
              title="RunPod API Key"
              value={runpodDraft}
              onChangeText={setRunpodDraft}
              placeholder="Paste your RunPod API key"
              hint="Rents and destroys GPU instances."
              onTest={async (key) => {
                const balance = await getRunPodBalance(key);
                return balance == null ? 'Key is valid' : '$' + balance.toFixed(2) + ' credit';
              }}
            />

            <View className="my-1 bg-surface-sunken h-px" />

            <VStack space="xs">
              <FieldLabel>Model downloads</FieldLabel>
              <Copy size="label" muted>
                Passed to the instance so gated models resolve. Leave blank if you only use public models.
              </Copy>
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

            <Action kind="primary" disabled={!hydrated} loading={saving} onPress={handleSave}>
              Save credentials
            </Action>

            <View className="my-1 bg-surface-sunken h-px" />

            {/* Templates and running instances live on the Servers/Templates tabs,
                not here — this page is credentials only. This link stays because
                it answers a different question ("is anything on this vast.ai
                account I'm not tracking"), not because instance management
                belongs in settings. */}
            <Link href="/settings/cloud-gpu/instances" asChild>
              <Pressable className="py-2">
                <HStack className="items-center justify-between">
                  <HStack space="sm" className="items-center">
                    <Icon as={Server} size="md" className="text-action" />
                    <VStack>
                      <Copy style={{ fontWeight: '500' }}>All cloud instances</Copy>
                      <Copy size="label" muted>
                        Includes instances created outside Comfy Portal
                      </Copy>
                    </VStack>
                  </HStack>
                  <Icon as={ChevronRight} size="sm" className="text-content-tertiary" />
                </HStack>
              </Pressable>
            </Link>
          </VStack>
        </ScrollView>
      </BottomSheetProvider>
    </View>
  );
}
