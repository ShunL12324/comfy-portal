import { AppBar } from '@/components/layout/app-bar';
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
import { useTemplateStore } from '@/features/cloud/stores/template-store';
import { createLaunch } from '@/features/cloud/services/provision';
import { LaunchProgress } from '@/features/cloud/components/launch-progress';
import { useProvisioningStore } from '@/features/cloud/stores/provisioning-store';
import { estimateDiskGb } from '@/features/cloud/types';
import { formatUsd } from '@/features/cloud/utils/cost';
import { searchOffers, type VastOffer } from '@/services/vast';
import { useRouter } from 'expo-router';
import { AlertTriangle, ChevronRight, Download, LayoutTemplate, MapPin } from 'lucide-react-native';
import React, { useState } from 'react';

type Step = 'template' | 'offer' | 'confirm' | 'provisioning';

export default function LaunchWizard() {
  const router = useRouter();
  const templates = useTemplateStore((s) => s.templates);
  const credentials = useCloudCredentialsStore();

  const [step, setStep] = useState<Step>('template');
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [offers, setOffers] = useState<VastOffer[] | null>(null);
  const [offer, setOffer] = useState<VastOffer | null>(null);
  const [searchError, setSearchError] = useState('');
  const [instanceId, setInstanceId] = useState<number | null>(null);
  const [launchError, setLaunchError] = useState('');

  // Read from the store, not from local state: the launch keeps progressing
  // while this screen is unmounted, and comes back where it actually is.
  const launch = useProvisioningStore((s) =>
    instanceId === null ? undefined : s.launches.find((l) => l.instanceId === instanceId),
  );

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
    setStep('provisioning');
    setLaunchError('');
    try {
      // Billing starts inside here. Everything after is driven by the poller
      // mounted at the root, so leaving this screen costs nothing.
      setInstanceId(
        await createLaunch({
          template,
          offerId: offer.id,
          pricePerHour: offer.pricePerHour,
          credentials,
        }),
      );
    } catch (error) {
      setLaunchError(error instanceof Error ? error.message : 'Launch failed');
    }
  };

  return (
    <View className="bg-background-0 flex-1">
      <AppBar title="Launch Cloud GPU" showBack />
      <ScrollView className="flex-1">
        <VStack className="px-5 pb-8 pt-4" space="md">
          {step === 'template' && (
            <>
              <Text className="text-sm text-typography-500">Pick what to install on the new machine.</Text>
              {templates.length === 0 ? (
                <VStack space="md" className="px-6 py-12 items-center">
                  <Icon as={LayoutTemplate} className="h-8 w-8 text-typography-300" />
                  <Text className="text-sm text-typography-400 text-center">
                    No templates yet. Create one in Cloud GPU settings first.
                  </Text>
                </VStack>
              ) : (
                templates.map((t) => (
                  <Pressable
                    key={t.id}
                    onPress={() => pickTemplate(t.id)}
                    className="rounded-xl bg-background-50 p-4 active:opacity-80"
                  >
                    <HStack className="items-center justify-between">
                      <VStack className="flex-1" space="xs">
                        <Text className="text-base font-medium text-typography-900">{t.name}</Text>
                        <Text className="text-xs text-typography-400">
                          {t.models.length} models · {t.gpuQuery} · {estimateDiskGb(t.models)} GB
                        </Text>
                      </VStack>
                      <Icon as={ChevronRight} size="sm" className="text-typography-400" />
                    </HStack>
                  </Pressable>
                ))
              )}
            </>
          )}

          {step === 'offer' && (
            <>
              <Text className="text-sm text-typography-500">
                Sorted by download speed — a fresh instance re-downloads every model, so bandwidth usually matters more
                than the hourly rate.
              </Text>
              {offers === null ? (
                <View className="py-12 items-center">
                  <Spinner size="small" />
                </View>
              ) : searchError ? (
                <Text className="py-8 text-sm text-error-500 text-center">{searchError}</Text>
              ) : offers.length === 0 ? (
                <Text className="py-8 text-sm text-typography-400 text-center">
                  No offers matched “{template?.gpuQuery}”. Try a different GPU name in the template.
                </Text>
              ) : (
                offers.map((o) => (
                  <Pressable
                    key={o.id}
                    onPress={() => {
                      setOffer(o);
                      setStep('confirm');
                    }}
                    className="rounded-xl bg-background-50 p-4 active:opacity-80"
                  >
                    <HStack className="items-start justify-between">
                      <VStack className="flex-1" space="xs">
                        <Text className="text-base font-medium text-typography-900">
                          {o.numGpus > 1 ? `${o.numGpus}× ` : ''}
                          {o.gpuName}
                          {o.gpuRamGb ? ` · ${o.gpuRamGb} GB` : ''}
                        </Text>
                        <HStack space="md">
                          <HStack space="xs" className="items-center">
                            <Icon as={Download} size="xs" className="text-typography-400" />
                            <Text className="text-xs text-typography-400">{Math.round(o.inetDown)} Mbps</Text>
                          </HStack>
                          <HStack space="xs" className="items-center">
                            <Icon as={MapPin} size="xs" className="text-typography-400" />
                            <Text className="text-xs text-typography-400">{o.geolocation || '—'}</Text>
                          </HStack>
                        </HStack>
                      </VStack>
                      <Text className="text-base font-semibold text-typography-900">
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
              <HStack space="sm" className="rounded-xl bg-background-50 p-4 items-start">
                <Icon as={AlertTriangle} size="sm" className="mt-0.5 text-warning-500" />
                <Text className="text-sm text-typography-700 flex-1">
                  Renting starts now and bills by the second until you destroy the instance — including the time spent
                  downloading models.
                </Text>
              </HStack>

              <VStack space="xs" className="rounded-xl bg-background-50 p-4">
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

              <HStack space="sm">
                <Button variant="outline" onPress={() => setStep('offer')} className="rounded-lg flex-1">
                  <ButtonText className="text-typography-500">Back</ButtonText>
                </Button>
                <Button onPress={startLaunch} className="rounded-lg bg-primary-500 flex-1">
                  <ButtonText>Rent & install</ButtonText>
                </Button>
              </HStack>
            </VStack>
          )}

          {step === 'provisioning' && (
            <VStack space="md" className="py-2">
              {launchError ? (
                <Text className="text-sm text-error-500">{launchError}</Text>
              ) : !launch ? (
                <View className="py-12 items-center">
                  <Spinner size="small" />
                </View>
              ) : (
                <>
                  <LaunchProgress launch={launch} />

                  {launch.stage === 'ready' ? (
                    <Button onPress={() => router.dismissAll()} className="rounded-lg bg-primary-500">
                      <ButtonText>Done</ButtonText>
                    </Button>
                  ) : (
                    <VStack space="sm">
                      <Text className="text-xs text-typography-400">
                        Safe to leave — the install keeps running and this screen picks it back up.
                      </Text>
                      <Button
                        variant="outline"
                        onPress={() => router.push('/settings/cloud-gpu/instances')}
                        className="rounded-lg"
                      >
                        <ButtonText className="text-xs">Manage instances</ButtonText>
                      </Button>
                    </VStack>
                  )}
                </>
              )}
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
      <Text className="text-xs text-typography-400">{label}</Text>
      <Text className="text-sm text-typography-900">{value}</Text>
    </HStack>
  );
}
