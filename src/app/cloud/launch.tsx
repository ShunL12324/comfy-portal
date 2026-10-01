import { FilterChips } from '@/components/ui/design-system/filter-chips';
import { supportsRunPod } from '@/features/cloud/services/runtime';
import { AppBar } from '@/components/layout/app-bar';
import { Action, Copy, Field, Panel, Row, Stepper, useDesign } from '@/components/ui/design-system/primitives';
import { Pressable } from '@/components/ui/pressable';
import { EmptyState } from '@/components/self-ui/empty-state';
import { RefreshScrollView } from '@/components/ui/design-system/pull-refresh';
import { View } from '@/components/ui/view';
import { createLaunch } from '@/features/cloud/services/provision';
import { loadHardware, type HardwareCatalog, type HardwareOffer } from '@/features/cloud/services/hardware';
import { useCloudCredentialsStore } from '@/features/cloud/stores/credentials-store';
import { useEnvironmentStore, useEnvironmentsHydrated } from '@/features/cloud/stores/environment-store';
import { diskHint, planDisk, type CloudProvider, type Environment } from '@/features/cloud/types';
import { CLOUD_GPU_SUPPORTED, CLOUD_GPU_UNSUPPORTED_REASON } from '@/features/cloud/utils/availability';
import { formatUsd } from '@/features/cloud/utils/cost';
import { hardwareEmptyReason } from '@/features/cloud/utils/hardware-empty';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Gpu } from '@/constants/icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { designTokens as t, iconStroke } from '@/constants/design-tokens';

type Step = 'hardware' | 'review';
const EMPTY_CATALOG: HardwareCatalog = { offers: [], balances: {}, errors: [], unavailable: [] };
const providerName = (provider: CloudProvider) => (provider === 'vast' ? 'Vast.ai' : 'RunPod');
const offerKey = (offer: HardwareOffer) => offer.provider + ':' + offer.offerId;
export default function LaunchWizard() {
  const { environmentId } = useLocalSearchParams<{ environmentId?: string }>();
  const hydrated = useEnvironmentsHydrated();
  const environment = useEnvironmentStore((state) => state.environments.find((item) => item.id === environmentId));
  const c = useDesign();
  if (!hydrated || !environment)
    return (
      <View style={{ flex: 1, backgroundColor: c.paper }}>
        <AppBar title="Create instance" showBack />
        <Copy style={{ paddingHorizontal: t.layout.gutter }}>
          {hydrated ? 'This environment is no longer available.' : 'Loading environment…'}
        </Copy>
      </View>
    );
  return <LaunchFlow key={environment.id} environment={environment} />;
}
function LaunchFlow({ environment }: { environment: Environment }) {
  const router = useRouter();
  const c = useDesign();
  const insets = useSafeAreaInsets();
  const credentials = useCloudCredentialsStore();
  const [recipe] = useState<Environment>(() => JSON.parse(JSON.stringify(environment)));
  const [step, setStep] = useState<Step>('hardware');
  const [provider, setProvider] = useState<'all' | CloudProvider>('all');
  const [query, setQuery] = useState('');
  const [diskPlan] = useState(() => planDisk(recipe.models));
  const [disk, setDisk] = useState(diskPlan.defaultGb);
  const [catalog, setCatalog] = useState<HardwareCatalog>(EMPTY_CATALOG);
  const [selected, setSelected] = useState<HardwareOffer>();
  const [loading, setLoading] = useState(true);
  const refreshLock = useRef(false);
  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState('');
  const requestId = useRef(0);
  const submitting = useRef(false);
  const minimumDisk = diskPlan.minGb;
  const { hydrated, vastApiKey, runpodApiKey } = credentials;
  const load = useCallback(() => {
    const id = ++requestId.current;
    const pending = CLOUD_GPU_SUPPORTED
      ? loadHardware(useCloudCredentialsStore.getState(), disk)
      : Promise.resolve(EMPTY_CATALOG);
    return pending
      .then((result) => {
        if (id !== requestId.current) return;
        setCatalog(result);
        setLoading(false);
      })
      .catch(() => {
        if (id !== requestId.current) return;
        setCatalog({ ...EMPTY_CATALOG, unavailable: ['vast', 'runpod'] });
        setLoading(false);
      });
  }, [disk]);
  useEffect(() => {
    if (hydrated) void load();
    return () => {
      requestId.current += 1;
    };
  }, [hydrated, vastApiKey, runpodApiKey, load]);
  const refresh = async () => {
    if (refreshLock.current || loading) return;
    refreshLock.current = true;
    setSelected(undefined);
    setLoading(true);
    setError('');
    try {
      await load();
    } finally {
      refreshLock.current = false;
    }
  };
  const offers = catalog.offers.filter(
    (offer) =>
      (provider === 'all' || provider === offer.provider) &&
      offer.gpuName.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const empty = hardwareEmptyReason({
    filter: provider,
    keys: { vast: !!vastApiKey, runpod: !!runpodApiKey },
    unavailable: catalog.unavailable,
  });
  const runpodDisk = selected?.provider === 'runpod' || provider === 'runpod';
  const rent = async () => {
    if (!selected || submitting.current || !CLOUD_GPU_SUPPORTED) return;
    submitting.current = true;
    setLaunching(true);
    setError('');
    try {
      // Quotes describe inventory at a point in time. Revalidate before a billable operation.
      const fresh = await loadHardware(credentials, disk);
      const current = fresh.offers.find((offer) => offerKey(offer) === offerKey(selected));
      if (!current || current.pricePerHour !== selected.pricePerHour || current.gpuCount !== selected.gpuCount) {
        setCatalog(fresh);
        setSelected(undefined);
        setStep('hardware');
        throw new Error('Availability or price changed. Select hardware and review again.');
      }
      const id = await createLaunch({ environment: recipe, hardware: current, credentials });
      router.replace({ pathname: '/cloud/launch-status/[instanceId]', params: { instanceId: id } });
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not create the instance.');
      submitting.current = false;
      setLaunching(false);
    }
  };
  return (
    <View style={{ flex: 1, backgroundColor: c.paper }}>
      <AppBar title={step === 'hardware' ? 'Choose hardware' : 'Review server'} showBack />
      <View style={{ paddingHorizontal: t.layout.gutter, paddingBottom: t.layout.field, gap: t.layout.related }}>
        <Copy muted size="label">
          {recipe.name}
        </Copy>
        {step === 'hardware' && (
          <>
            <FilterChips
              label="Hardware provider"
              value={provider}
              options={[
                { value: 'all', label: 'All' },
                { value: 'vast', label: 'Vast.ai' },
                { value: 'runpod', label: 'RunPod' },
              ]}
              onChange={(value) => {
                setProvider(value as 'all' | CloudProvider);
                setSelected(undefined);
              }}
            />
            <Row style={{ gap: t.layout.related }}>
              <View style={{ flex: 1 }}>
                <Field search label="Search GPUs" value={query} onChange={setQuery} />
              </View>
            </Row>
          </>
        )}
      </View>
      <View style={{ flex: 1, minHeight: 0 }}>
        <RefreshScrollView
          refreshing={step === 'hardware' && loading}
          onRefresh={step === 'hardware' ? refresh : undefined}
          contentContainerStyle={{
            paddingHorizontal: t.layout.gutter,
            gap: t.layout.section,
            paddingBottom: step === 'hardware' ? t.layout.inset : insets.bottom + t.layout.section,
          }}
        >
          {step === 'hardware' ? (
            <>
              <View style={{ gap: t.layout.list }}>
                {offers.map((offer) => {
                  const active = selected && offerKey(selected) === offerKey(offer);
                  return (
                    <Pressable
                      key={offerKey(offer)}
                      accessibilityRole="radio"
                      accessibilityLabel={offer.gpuName + ' on ' + offer.provider}
                      accessibilityState={{ checked: !!active }}
                      onPress={() => {
                        setSelected(offer);
                        setError('');
                      }}
                      style={{
                        backgroundColor: active ? c.raised : c.card,
                        borderRadius: t.radius.panel,
                        padding: t.layout.inset,
                        borderWidth: 1,
                        borderColor: active ? c.ink : 'transparent',
                        gap: t.layout.related,
                      }}
                    >
                      <Row style={{ gap: t.layout.related }}>
                        <Gpu size={t.icon.large} strokeWidth={iconStroke(t.icon.large)} color={c.ink} />
                        <View style={{ flex: 1, gap: t.layout.label }}>
                          <Copy size="body">
                            {offer.gpuCount > 1 ? offer.gpuCount + ' × ' : ''}
                            {offer.gpuName}
                          </Copy>
                          <Copy muted size="metadata">
                            {offer.provider === 'vast' ? 'Vast.ai' : 'RunPod Secure Cloud'} · {offer.memoryGb} GB VRAM
                          </Copy>
                        </View>
                        <Copy mono size="metadata">
                          {offer.priceScope === 'gpu-starting' ? 'From ' : ''}
                          {formatUsd(offer.pricePerHour)}/hr
                        </Copy>
                      </Row>
                      <Copy muted size="metadata">
                        {offer.provider === 'vast'
                          ? [
                              offer.downloadMbps != null ? Math.round(offer.downloadMbps) + ' Mbps download' : '',
                              offer.location,
                            ]
                              .filter(Boolean)
                              .join(' · ')
                          : [
                              offer.stock + ' availability',
                              offer.vcpu != null ? offer.vcpu + '+ vCPU' : '',
                              offer.systemMemoryGb != null ? offer.systemMemoryGb + '+ GB RAM' : '',
                            ]
                              .filter(Boolean)
                              .join(' · ')}
                      </Copy>
                    </Pressable>
                  );
                })}
                {!loading &&
                  !offers.length &&
                  CLOUD_GPU_SUPPORTED &&
                  hydrated &&
                  (empty.reason === 'no-key' ? (
                    <EmptyState
                      title={
                        provider === 'all' ? 'No cloud account' : providerName(empty.providers[0]) + ' not connected'
                      }
                      action={
                        <Action onPress={() => router.navigate('/settings/cloud-gpu')}>
                          {provider === 'all'
                            ? 'Connect cloud account'
                            : 'Connect ' + providerName(provider) + ' account'}
                        </Action>
                      }
                    >
                      Add an API key to see available GPUs.
                    </EmptyState>
                  ) : empty.reason === 'failed' ? (
                    <EmptyState title="Could not load hardware">
                      {empty.providers.map(providerName).join(' and ')} did not respond. Pull down to retry.
                    </EmptyState>
                  ) : (
                    <EmptyState>No matching hardware available.</EmptyState>
                  ))}
              </View>
              {catalog.errors.map((message) => (
                <Copy key={message} muted size="metadata">
                  {message}
                </Copy>
              ))}
              {selected?.provider === 'runpod' && !supportsRunPod(recipe) && (
                <Copy muted size="metadata">
                  RunPod creation is not available in this app build yet.
                </Copy>
              )}
            </>
          ) : (
            selected && (
              <>
                <Panel filled style={{ padding: t.layout.inset, gap: t.layout.related }}>
                  <Row style={{ gap: t.layout.related }}>
                    <Gpu size={t.icon.large} strokeWidth={iconStroke(t.icon.large)} color={c.ink} />
                    <Copy>{selected.gpuName}</Copy>
                  </Row>
                  {[
                    ['Provider', selected.provider === 'vast' ? 'Vast.ai' : 'RunPod Secure Cloud'],
                    ['GPU', selected.gpuCount + ' × ' + selected.memoryGb + ' GB VRAM'],
                    ['Disk', disk + ' GB' + (selected.provider === 'runpod' ? ' volume + 20 GB container' : '')],
                    [
                      'Account balance',
                      catalog.balances[selected.provider] == null
                        ? 'Unavailable'
                        : formatUsd(catalog.balances[selected.provider]!),
                    ],
                    [
                      selected.priceScope === 'gpu-starting' ? 'GPU starting rate' : 'Listed hourly rate',
                      formatUsd(selected.pricePerHour) + '/hr',
                    ],
                  ].map(([label, value]) => (
                    <Row key={label} style={{ gap: t.layout.related, alignItems: 'flex-start' }}>
                      <Copy muted size="label" style={{ width: 120 }}>
                        {label}
                      </Copy>
                      <Copy size="label" style={{ flex: 1 }}>
                        {value}
                      </Copy>
                    </Row>
                  ))}
                </Panel>
                {[
                  {
                    title: 'Extensions',
                    items: recipe.extensions.map((url) => url.replace('https://github.com/', '')),
                  },
                  { title: 'Models', items: recipe.models.map((model) => model.label || model.filename || model.url) },
                  { title: 'Workflows', items: recipe.workflows.map((workflow) => workflow.name) },
                  ...(recipe.ollamaModels?.length ? [{ title: 'Ollama models', items: recipe.ollamaModels }] : []),
                ].map((group) => (
                  <View key={group.title} style={{ gap: t.layout.label }}>
                    <Copy size="body" style={{ fontWeight: '500' }}>
                      {group.title} · {group.items.length}
                    </Copy>
                    {group.items.length ? (
                      group.items.map((item, index) => (
                        <Copy key={index} muted size="label">
                          {item}
                        </Copy>
                      ))
                    ) : (
                      <Copy muted size="label">
                        None required
                      </Copy>
                    )}
                  </View>
                ))}
                <Copy muted size="metadata">
                  Billing starts when the instance is created, including installation. Destroy it when finished.
                  {selected.priceScope === 'gpu-starting'
                    ? ' Storage and other charges are additional to the displayed GPU rate.'
                    : ''}
                </Copy>
                <Action kind="primary" loading={launching} onPress={rent}>
                  Create server
                </Action>
                <Action kind="secondary" disabled={launching} onPress={() => setStep('hardware')}>
                  Change hardware
                </Action>
              </>
            )
          )}
          {!CLOUD_GPU_SUPPORTED && (
            <Copy muted size="label">
              {CLOUD_GPU_UNSUPPORTED_REASON}
            </Copy>
          )}
          {!!error && (
            <>
              <Copy accessibilityRole="alert">{error}</Copy>
              <Action kind="secondary" onPress={() => router.navigate('/settings/cloud-gpu/instances')}>
                Review cloud account
              </Action>
            </>
          )}
        </RefreshScrollView>
      </View>
      {step === 'hardware' && (
        <View
          style={{
            paddingHorizontal: t.layout.gutter,
            paddingTop: t.layout.related,
            paddingBottom: Math.max(insets.bottom, t.layout.field),
            backgroundColor: c.paper,
            gap: t.layout.field,
          }}
        >
          <View style={{ gap: t.layout.label }}>
            <Row style={{ gap: t.layout.related }}>
              <Copy size="label" style={{ flex: 1 }}>
                {runpodDisk ? 'Volume disk · GB' : 'Disk · GB'}
              </Copy>
              <View style={{ flex: 1 }}>
                <Stepper
                  label="Disk capacity in GB"
                  value={disk}
                  min={minimumDisk}
                  max={10000}
                  step={10}
                  onChange={(value) => {
                    setSelected(undefined);
                    setCatalog(EMPTY_CATALOG);
                    setLoading(true);
                    setDisk(value);
                  }}
                />
              </View>
            </Row>
            <Copy muted size="metadata">
              {diskHint(diskPlan)}
              {runpodDisk ? ' 20 GB container disk · volume storage is billed separately.' : ''}
            </Copy>
          </View>
          <Action
            kind="primary"
            fill
            disabled={
              !selected ||
              loading ||
              !CLOUD_GPU_SUPPORTED ||
              (selected.provider === 'runpod' && !supportsRunPod(recipe))
            }
            onPress={() => setStep('review')}
          >
            Next
          </Action>
        </View>
      )}
    </View>
  );
}
