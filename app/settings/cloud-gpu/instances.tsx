import { destroyManagedInstance } from '@/features/cloud/services/instance-destruction';
import { AppBar } from '@/components/layout/app-bar';
import { ConfirmDialog } from '@/components/self-ui/confirm-dialog';
import { Action, Copy, Row, useDesign } from '@/components/ui/design-system/primitives';
import { ScrollView } from '@/components/ui/scroll-view';
import { View } from '@/components/ui/view';
import { useCloudCredentialsStore } from '@/features/cloud/stores/credentials-store';
import { launchKey } from '@/features/cloud/stores/provisioning-store';
import { useLaunchRequestStore, type LaunchRequest } from '@/features/cloud/stores/launch-request-store';
import { listCloudInstances, type CloudInstance } from '@/features/cloud/services/provider';
import { discardLaunchRequest, reconcileLaunchRequest } from '@/features/cloud/services/provision';
import { CLOUD_GPU_SUPPORTED, CLOUD_GPU_UNSUPPORTED_REASON } from '@/features/cloud/utils/availability';
import { formatUsd } from '@/features/cloud/utils/cost';
import { CryptoDigestAlgorithm, digestStringAsync } from 'expo-crypto';
import type { CloudProvider } from '@/features/cloud/types';
import { showToast } from '@/utils/toast';
import { RefreshCw } from '@/constants/icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { designTokens as t } from '@/constants/design-tokens';

const providerLabel = (provider: CloudProvider) => (provider === 'vast' ? 'Vast.ai' : 'RunPod');

export default function CloudInstances() {
  const c = useDesign();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const credentials = useCloudCredentialsStore();
  const requests = useLaunchRequestStore((state) => state.requests);
  const [instances, setInstances] = useState<CloudInstance[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [checked, setChecked] = useState<Partial<Record<CloudProvider, { accountHash: string; credential: string }>>>(
    {},
  );
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [destroying, setDestroying] = useState<CloudInstance>();
  const [discarding, setDiscarding] = useState<LaunchRequest>();
  const lock = useRef(false);
  const requestId = useRef(0);
  const { vastApiKey, runpodApiKey, hydrated } = credentials;
  const load = useCallback(() => {
    const id = ++requestId.current;
    const keys = useCloudCredentialsStore.getState();
    const providers = (['vast', 'runpod'] as const).filter(
      (provider) => CLOUD_GPU_SUPPORTED && (provider === 'vast' ? keys.vastApiKey : keys.runpodApiKey),
    );
    return Promise.allSettled(
      providers.map(async (provider) => ({
        instances: await listCloudInstances(provider, keys),
        accountHash: await digestStringAsync(
          CryptoDigestAlgorithm.SHA256,
          provider === 'vast' ? keys.vastApiKey : keys.runpodApiKey,
        ),
      })),
    ).then((results) => {
      if (id !== requestId.current) return;
      setInstances(results.flatMap((result) => (result.status === 'fulfilled' ? result.value.instances : [])));
      setErrors(
        results.flatMap((result, index) =>
          result.status === 'rejected'
            ? [
                providers[index] +
                  ': ' +
                  (result.reason instanceof Error ? result.reason.message : 'Could not load instances.'),
              ]
            : [],
        ),
      );
      setChecked(
        Object.fromEntries(
          results.flatMap((result, index) =>
            result.status === 'fulfilled'
              ? [
                  [
                    providers[index],
                    {
                      accountHash: result.value.accountHash,
                      credential: providers[index] === 'vast' ? keys.vastApiKey : keys.runpodApiKey,
                    },
                  ],
                ]
              : [],
          ),
        ),
      );
      setLoading(false);
    });
  }, []);
  useEffect(() => {
    if (hydrated) void load();
    return () => {
      requestId.current += 1;
    };
  }, [hydrated, vastApiKey, runpodApiKey, load]);
  const refresh = () => {
    setLoading(true);
    void load();
  };
  const act = async (action: () => Promise<void>) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    try {
      await action();
    } catch (error) {
      showToast.error(
        'Could not complete action',
        error instanceof Error ? error.message : 'Try again.',
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const destroy = () =>
    act(async () => {
      if (!destroying) return;
      await destroyManagedInstance(destroying, credentials);
      setDestroying(undefined);
      await load();
    });
  return (
    <View style={{ flex: 1, backgroundColor: c.paper }}>
      <AppBar
        title="Cloud instances"
        showBack
        rightElement={
          <Action kind="text" icon={RefreshCw} label="Refresh instances" loading={loading} onPress={refresh} />
        }
      />
      <ScrollView contentContainerStyle={{ padding: t.layout.gutter, gap: t.layout.list, paddingBottom: insets.bottom + t.layout.section }}>
        {!CLOUD_GPU_SUPPORTED ? (
          <Copy muted>{CLOUD_GPU_UNSUPPORTED_REASON}</Copy>
        ) : !vastApiKey && !runpodApiKey ? (
          <Action onPress={() => router.push('/settings/cloud-gpu')}>Connect cloud account</Action>
        ) : null}
        {errors.map((error) => (
          <Copy key={error} accessibilityRole="alert">
            {error}
          </Copy>
        ))}
        {requests.map((request) => (
          <View key={request.id} style={{ backgroundColor: c.card, borderRadius: t.radius.panel, padding: t.layout.inset, gap: t.layout.related }}>
            <Copy>{request.environment.name} · Unconfirmed order</Copy>
            <Copy muted size="metadata">
              {request.hardware.provider} · {request.label}
            </Copy>
            <Action
              disabled={busy}
              onPress={() =>
                act(async () => {
                  const id = await reconcileLaunchRequest(request, credentials);
                  router.push({ pathname: '/cloud/launch-status/[instanceId]', params: { instanceId: id } });
                })
              }
            >
              Check order
            </Action>
            {checked[request.hardware.provider]?.accountHash === request.accountHash &&
              checked[request.hardware.provider]?.credential ===
                (request.hardware.provider === 'vast' ? vastApiKey : runpodApiKey) &&
              !request.receipt &&
              !instances.some(
                (instance) => instance.name === request.label && instance.provider === request.hardware.provider,
              ) && (
                <Action kind="secondary" disabled={busy} onPress={() => setDiscarding(request)}>
                  Order was not created
                </Action>
              )}
          </View>
        ))}
        {instances.map((instance) => (
          <View key={launchKey(instance)} style={{ backgroundColor: c.card, borderRadius: t.radius.panel, padding: t.layout.inset, gap: t.layout.label }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Copy style={{ flex: 1 }} numberOfLines={1}>
                {instance.gpuName || instance.name || instance.instanceId}
              </Copy>
              <Copy muted size="metadata">
                {providerLabel(instance.provider)}
              </Copy>
            </Row>
            <Copy muted size="metadata">
              {instance.status} ·{' '}
              {instance.pricePerHour == null ? 'Rate unavailable' : formatUsd(instance.pricePerHour) + '/hr'}
            </Copy>
            <Copy mono muted size="micro">
              {instance.instanceId}
            </Copy>
            <Row>
              <Action kind="secondary" destructive disabled={busy} onPress={() => setDestroying(instance)}>
                Destroy instance
              </Action>
            </Row>
          </View>
        ))}
        {CLOUD_GPU_SUPPORTED && !loading && !instances.length && !errors.length && (
          <Copy muted>No instances on these accounts.</Copy>
        )}
      </ScrollView>
      <ConfirmDialog
        isOpen={!!destroying}
        loading={busy}
        destructive
        title="Destroy instance?"
        description={
          destroying
            ? `This permanently removes ${providerLabel(destroying.provider)} instance ${destroying.instanceId} and its attached disks. Download anything you need first. Separate storage may continue billing.`
            : ''
        }
        confirmText="Destroy instance"
        onClose={() => {
          if (!busy) setDestroying(undefined);
        }}
        onConfirm={destroy}
      />
      <ConfirmDialog
        isOpen={!!discarding}
        loading={busy}
        title="Clear unconfirmed order?"
        description="Only clear this record after checking the provider dashboard and confirming that no instance was created. Clearing it does not stop any instance or billing."
        confirmText="No instance was created"
        onClose={() => {
          if (!busy) setDiscarding(undefined);
        }}
        onConfirm={() =>
          act(async () => {
            if (!discarding) return;
            await discardLaunchRequest(discarding.id, useCloudCredentialsStore.getState());
            setDiscarding(undefined);
          })
        }
      />
    </View>
  );
}
