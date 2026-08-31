import { AppBar } from '@/components/layout/app-bar';
import { EmptyState } from '@/components/self-ui/empty-state';
import { Button, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { ScrollView } from '@/components/ui/scroll-view';
import { RotatingSpinner } from '@/components/ui/rotating-spinner';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { VStack } from '@/components/ui/vstack';
import { useCloudCredentialsStore } from '@/features/cloud/stores/credentials-store';
import { useTemplateStore } from '@/features/cloud/stores/template-store';
import { createLaunch } from '@/features/cloud/services/provision';
import { estimateDiskGb } from '@/features/cloud/types';
import { formatUsd } from '@/features/cloud/utils/cost';
import { searchOffers, type VastOffer } from '@/services/vast';
import { useRouter } from 'expo-router';
import { AlertTriangle, ChevronRight, Download, LayoutTemplate, MapPin } from 'lucide-react-native';
import React, { useState } from 'react';

type Step = 'template' | 'offer' | 'confirm';

export default function LaunchWizard() {
  const router = useRouter();
  const templates = useTemplateStore((s) => s.templates);
  const credentials = useCloudCredentialsStore();

  const [step, setStep] = useState<Step>('template');
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [offers, setOffers] = useState<VastOffer[] | null>(null);
  const [offer, setOffer] = useState<VastOffer | null>(null);
  const [searchError, setSearchError] = useState('');
  const [launching, setLaunching] = useState(false);
  const [launchError, setLaunchError] = useState('');

  const template = templates.find((t) => t.id === templateId);

  const pickTemplate = async (id: string) => {
    const picked = templates.find((t) => t.id === id);
    if (!picked) return;
    setTemplateId(id);
    setStep('offer');
    setOffers(null);
    setSearchError('');
    try {
      setOffers(
        await searchOffers(credentials.vastApiKey, {
          gpuName: picked.gpuQuery,
          minDiskGb: estimateDiskGb(picked.models),
          limit: 6,
        }),
      );
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : 'Search failed');
      setOffers([]);
    }
  };

  const startLaunch = async () => {
    if (!template || !offer) return;
    setLaunching(true);
    setLaunchError('');
    try {
      // Billing starts inside here. The launch-status screen is the
      // persistent home for everything after this — leaving it (or this
      // wizard never having existed at all, on a cold start) costs nothing,
      // the root-mounted poller keeps it moving either way.
      const instanceId = await createLaunch({
        template,
        offerId: offer.id,
        pricePerHour: offer.pricePerHour,
        credentials,
      });
      router.replace(`/cloud/launch-status/${instanceId}`);
    } catch (error) {
      setLaunchError(error instanceof Error ? error.message : 'Launch failed');
      setLaunching(false);
    }
  };

  return (
    <View className="bg-surface-base flex-1">
      <AppBar title="Launch Cloud GPU" showBack />
      <ScrollView className="flex-1">
        <VStack className="px-5 pb-8 pt-4" space="md">
          {step === 'template' && (
            <>
              <Text className="text-sm text-content-secondary">Pick what to install on the new machine.</Text>
              {templates.length === 0 ? (
                <EmptyState
                  action={
                    <Button variant="outline" onPress={() => router.push('/explore')} className="rounded-lg">
                      <ButtonText className="text-action">Go to Explore</ButtonText>
                    </Button>
                  }
                >
                  No templates yet. Create one from the Explore tab first.
                </EmptyState>
              ) : (
                templates.map((t) => (
                  <Pressable
                    key={t.id}
                    onPress={() => pickTemplate(t.id)}
                    className="rounded-xl bg-surface-raised p-4 active:opacity-80"
                  >
                    <HStack className="items-center justify-between">
                      <VStack className="flex-1" space="xs">
                        <Text className="text-base font-medium text-content-heading">{t.name}</Text>
                        <Text className="text-xs text-content-tertiary">
                          {t.models.length} models · {t.gpuQuery} · {estimateDiskGb(t.models)} GB
                        </Text>
                      </VStack>
                      <Icon as={ChevronRight} size="sm" className="text-content-tertiary" />
                    </HStack>
                  </Pressable>
                ))
              )}
            </>
          )}

          {step === 'offer' && (
            <>
              <Text className="text-sm text-content-secondary">
                Sorted by download speed — a fresh instance re-downloads every model, so bandwidth usually matters more
                than the hourly rate.
              </Text>
              {offers === null ? (
                <View className="py-12 items-center">
                  <RotatingSpinner size="sm" />
                </View>
              ) : searchError ? (
                <Text className="py-8 text-sm text-status-danger text-center">{searchError}</Text>
              ) : offers.length === 0 ? (
                <Text className="py-8 text-sm text-content-tertiary text-center">
                  No offers matched &quot;{template?.gpuQuery}&quot;. Try a different GPU name in the template.
                </Text>
              ) : (
                offers.map((o) => (
                  <Pressable
                    key={o.id}
                    onPress={() => {
                      setOffer(o);
                      setStep('confirm');
                    }}
                    className="rounded-xl bg-surface-raised p-4 active:opacity-80"
                  >
                    <HStack className="items-start justify-between">
                      <VStack className="flex-1" space="xs">
                        <Text className="text-base font-medium text-content-heading">
                          {o.numGpus > 1 ? `${o.numGpus}× ` : ''}
                          {o.gpuName}
                          {o.gpuRamGb ? ` · ${o.gpuRamGb} GB` : ''}
                        </Text>
                        <HStack space="md">
                          <HStack space="xs" className="items-center">
                            <Icon as={Download} size="xs" className="text-content-tertiary" />
                            <Text className="text-xs text-content-tertiary">{Math.round(o.inetDown)} Mbps</Text>
                          </HStack>
                          <HStack space="xs" className="items-center">
                            <Icon as={MapPin} size="xs" className="text-content-tertiary" />
                            <Text className="text-xs text-content-tertiary">{o.geolocation || '—'}</Text>
                          </HStack>
                        </HStack>
                      </VStack>
                      <Text className="text-base font-semibold text-content-heading">
                        {formatUsd(o.pricePerHour)}/hr
                      </Text>
                    </HStack>
                  </Pressable>
                ))
              )}
            </>
          )}

          {step === 'confirm' && offer && template && (
            <VStack space="md">
              {/* Its own step on purpose: the next tap starts billing. */}
              <HStack space="sm" className="rounded-xl bg-surface-raised p-4 items-start">
                <Icon as={AlertTriangle} size="sm" className="mt-0.5 text-status-busy" />
                <Text className="text-sm text-content-body flex-1">
                  Renting starts now and bills by the second until you destroy the instance — including the time spent
                  downloading models.
                </Text>
              </HStack>

              <VStack space="xs" className="rounded-xl bg-surface-raised p-4">
                <Row label="Template" value={template.name} />
                <Row label="GPU" value={`${offer.numGpus > 1 ? `${offer.numGpus}× ` : ''}${offer.gpuName}`} />
                <Row label="Location" value={offer.geolocation || '—'} />
                <Row label="Disk" value={`${template.disk} GB`} />
                <Row label="Rate" value={`${formatUsd(offer.pricePerHour)}/hr`} />
                <Row
                  label="Models"
                  value={`${template.models.length} file${template.models.length === 1 ? '' : 's'}`}
                />
              </VStack>

              {launchError ? <Text className="text-sm text-status-danger">{launchError}</Text> : null}

              <HStack space="sm">
                <Button
                  variant="outline"
                  onPress={() => setStep('offer')}
                  isDisabled={launching}
                  className="rounded-lg flex-1"
                >
                  <ButtonText className="text-content-secondary">Back</ButtonText>
                </Button>
                <Button onPress={startLaunch} isDisabled={launching} className="rounded-lg bg-action flex-1">
                  {launching ? <RotatingSpinner size="sm" /> : <ButtonText>Rent & install</ButtonText>}
                </Button>
              </HStack>
            </VStack>
          )}
        </VStack>
      </ScrollView>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <HStack className="py-1 items-center justify-between">
      <Text className="text-xs text-content-tertiary">{label}</Text>
      <Text className="text-sm text-content-heading">{value}</Text>
    </HStack>
  );
}
