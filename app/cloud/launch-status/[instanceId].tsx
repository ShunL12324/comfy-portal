import { AppBar } from '@/components/layout/app-bar';
import { EmptyState } from '@/components/self-ui/empty-state';
import { Button, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { ScrollView } from '@/components/ui/scroll-view';
import { RotatingSpinner } from '@/components/ui/rotating-spinner';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { VStack } from '@/components/ui/vstack';
import { DeleteAlert } from '@/features/generation/components/history-drawer/delete-alert';
import { LaunchProgress } from '@/features/cloud/components/launch-progress';
import { useCloudCredentialsStore } from '@/features/cloud/stores/credentials-store';
import { useProvisioningStore } from '@/features/cloud/stores/provisioning-store';
import { useServersStore } from '@/features/server/stores/server-store';
import { destroyInstance } from '@/services/vast';
import { showToast } from '@/utils/toast';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CloudOff } from 'lucide-react-native';
import React, { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * The persistent home for a rented instance's progress — reachable from the
 * launch wizard (redirected here the moment billing starts) AND from the
 * LaunchCard on the Servers tab, so "how's my download going" always has a
 * place to go back to instead of living only inside the wizard you happened
 * to launch from.
 */
export default function LaunchStatus() {
  const { instanceId: instanceIdParam } = useLocalSearchParams<{ instanceId: string }>();
  const instanceId = Number(instanceIdParam);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const vastApiKey = useCloudCredentialsStore((s) => s.vastApiKey);
  const removeServer = useServersStore((s) => s.removeServer);
  const removeLaunch = useProvisioningStore((s) => s.remove);
  const launch = useProvisioningStore((s) => s.launches.find((l) => l.instanceId === instanceId));
  const [destroying, setDestroying] = useState(false);
  const [confirmDestroy, setConfirmDestroy] = useState(false);

  const handleDestroy = async () => {
    if (!launch) return;
    setDestroying(true);
    try {
      await destroyInstance(vastApiKey, launch.instanceId);
      if (launch.serverId) removeServer(launch.serverId);
      removeLaunch(launch.instanceId);
      showToast.success('Destroyed', 'Instance stopped', insets.top + 8);
      router.back();
    } catch (error) {
      showToast.error('Failed', error instanceof Error ? error.message : 'Could not destroy instance', insets.top + 8);
    } finally {
      setDestroying(false);
      setConfirmDestroy(false);
    }
  };

  return (
    <View className="bg-surface-base flex-1">
      <AppBar title={launch?.templateName ?? 'Instance'} showBack />
      <ScrollView className="flex-1">
        <VStack className="px-5 pb-8 pt-4" space="md">
          {!launch ? (
            <EmptyState icon={CloudOff}>No longer tracked — it may already have been destroyed.</EmptyState>
          ) : (
            <>
              <LaunchProgress launch={launch} />

              {launch.stage === 'ready' ? (
                <VStack space="sm">
                  {launch.serverId ? (
                    <Button
                      onPress={() => router.replace(`/workflow/${launch.serverId}`)}
                      className="rounded-lg bg-action"
                    >
                      <ButtonText>Open Server</ButtonText>
                    </Button>
                  ) : (
                    <View className="py-4 items-center">
                      <RotatingSpinner size="sm" />
                    </View>
                  )}
                  <Button variant="outline" onPress={() => router.replace('/')} className="rounded-lg">
                    <ButtonText className="text-content-secondary">Back to Servers</ButtonText>
                  </Button>
                </VStack>
              ) : (
                <Text className="text-xs text-content-tertiary">
                  Safe to leave — the install keeps running and this instance stays on the Servers tab until it&apos;s ready.
                </Text>
              )}

              <HStack className="mt-2">
                <Button
                  variant="outline"
                  onPress={() => setConfirmDestroy(true)}
                  isDisabled={destroying}
                  className="rounded-lg flex-1 border-error-300"
                >
                  <ButtonText className="text-status-danger">{destroying ? 'Destroying…' : 'Destroy'}</ButtonText>
                </Button>
              </HStack>
            </>
          )}
        </VStack>
      </ScrollView>

      <DeleteAlert
        isOpen={confirmDestroy}
        onClose={() => setConfirmDestroy(false)}
        onConfirm={handleDestroy}
        title="Destroy Instance"
        description="Billing stops, and everything on its disk — models, outputs, workflows — is deleted. This cannot be undone."
      />
    </View>
  );
}
