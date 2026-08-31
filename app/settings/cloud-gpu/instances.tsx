import { AppBar } from '@/components/layout/app-bar';
import { EmptyState } from '@/components/self-ui/empty-state';
import { StatusDot } from '@/components/self-ui/status-pill';
import { Button, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { ScrollView } from '@/components/ui/scroll-view';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { VStack } from '@/components/ui/vstack';
import { DeleteAlert } from '@/features/generation/components/history-drawer/delete-alert';
import { CLOUD_GPU_SUPPORTED, CLOUD_GPU_UNSUPPORTED_REASON } from '@/features/cloud/utils/availability';
import { useCloudCredentialsStore } from '@/features/cloud/stores/credentials-store';
import { accruedCost, formatUptime, formatUsd } from '@/features/cloud/utils/cost';
import { destroyInstance, listInstances, type VastInstance } from '@/services/vast';
import { showToast } from '@/utils/toast';
import { CloudOff, Server } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function CloudInstances() {
  const insets = useSafeAreaInsets();
  const { vastApiKey, hydrated } = useCloudCredentialsStore();
  const [instances, setInstances] = useState<VastInstance[] | null>(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [pendingDestroy, setPendingDestroy] = useState<VastInstance | null>(null);
  // Re-render once a minute so uptime and cost stay honest without a manual pull.
  const [, setTick] = useState(0);

  const load = useCallback(async () => {
    if (!CLOUD_GPU_SUPPORTED || !vastApiKey) {
      setInstances([]);
      return;
    }
    try {
      setError('');
      setInstances(await listInstances(vastApiKey));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load instances');
      setInstances([]);
    }
  }, [vastApiKey]);

  useEffect(() => {
    if (hydrated) void load();
  }, [hydrated, load]);

  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(timer);
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const confirmDestroy = async () => {
    if (!pendingDestroy) return;
    try {
      await destroyInstance(vastApiKey, pendingDestroy.id);
      showToast.success('Destroyed', `Instance ${pendingDestroy.id} stopped`, insets.top + 8);
      setPendingDestroy(null);
      await load();
    } catch (e) {
      showToast.error('Failed', e instanceof Error ? e.message : 'Could not destroy instance', insets.top + 8);
    }
  };

  const running = instances?.filter((i) => i.status === 'running') ?? [];
  const totalPerHour = running.reduce((sum, i) => sum + i.pricePerHour, 0);

  return (
    <View className="bg-surface-base flex-1">
      <AppBar title="Instances" showBack />

      {running.length > 0 && (
        <View className="mx-5 mt-3 rounded-xl bg-surface-raised p-3">
          <Text className="text-sm font-medium text-content-heading">
            {running.length} running · {formatUsd(totalPerHour)}/hr
          </Text>
        </View>
      )}

      <ScrollView
        className="flex-1"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        <VStack className="px-5 pb-8 pt-4" space="sm">
          {!CLOUD_GPU_SUPPORTED ? (
            <EmptyState icon={CloudOff}>{CLOUD_GPU_UNSUPPORTED_REASON}</EmptyState>
          ) : !hydrated || instances === null ? (
            <View className="py-12 items-center">
              <Spinner size="small" />
            </View>
          ) : !vastApiKey ? (
            <EmptyState icon={CloudOff}>Add a vast.ai API key in Cloud GPU settings to see your instances.</EmptyState>
          ) : error ? (
            <EmptyState icon={CloudOff}>{error}</EmptyState>
          ) : instances.length === 0 ? (
            <EmptyState icon={Server}>No instances on this account.</EmptyState>
          ) : (
            instances.map((instance) => (
              <InstanceCard key={instance.id} instance={instance} onDestroy={() => setPendingDestroy(instance)} />
            ))
          )}
        </VStack>
      </ScrollView>

      <DeleteAlert
        isOpen={!!pendingDestroy}
        onClose={() => setPendingDestroy(null)}
        onConfirm={confirmDestroy}
        title="Destroy Instance"
        description={
          pendingDestroy
            ? `Destroy ${pendingDestroy.gpuName || `instance ${pendingDestroy.id}`}? Billing stops, and everything on its disk — models, outputs, workflows — is deleted. This cannot be undone.`
            : ''
        }
      />
    </View>
  );
}


function InstanceCard({ instance, onDestroy }: { instance: VastInstance; onDestroy: () => void }) {
  const isRunning = instance.status === 'running';
  const cost = instance.startedAt ? accruedCost(instance.startedAt, instance.pricePerHour) : 0;

  return (
    <View className="rounded-xl bg-surface-raised p-4">
      <HStack className="items-start justify-between">
        <VStack className="flex-1" space="xs">
          <HStack space="xs" className="items-center">
            <StatusDot tone={isRunning ? 'ready' : 'offline'} />
            <Text className="text-base font-medium text-content-heading" numberOfLines={1}>
              {instance.gpuName || `Instance ${instance.id}`}
            </Text>
          </HStack>
          <Text className="text-xs text-content-tertiary">
            {instance.label ? `${instance.label} · ` : ''}
            {instance.status}
            {instance.publicIp ? ` · ${instance.publicIp}` : ''}
          </Text>
          {isRunning && instance.startedAt && (
            <Text className="text-xs text-content-secondary">
              {formatUptime(instance.startedAt)} · {formatUsd(cost)} so far · {formatUsd(instance.pricePerHour)}/hr
            </Text>
          )}
          {!isRunning && instance.statusMessage ? (
            <Text className="text-xs text-content-tertiary" numberOfLines={2}>
              {instance.statusMessage}
            </Text>
          ) : null}
        </VStack>

        <Button variant="outline" size="xs" onPress={onDestroy} className="ml-3 rounded-lg border-error-300">
          <ButtonText className="text-xs text-status-danger">Destroy</ButtonText>
        </Button>
      </HStack>
    </View>
  );
}
