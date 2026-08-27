import { OptionSelector } from '@/components/common/selectors/option-selector';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { VStack } from '@/components/ui/vstack';
import { useCloudCredentialsStore } from '@/features/cloud/stores/credentials-store';
import { listAvailableGpus, type GpuChoice } from '@/services/vast';
import React, { useEffect, useState } from 'react';

/**
 * Picks a GPU from what vast can actually rent right now.
 *
 * Not a text field: vast uses its own short names ("RTX PRO 6000 WS" for the
 * Workstation Edition), the catalogue moves, and a near-miss returns an empty
 * offer list with nothing to explain why. Showing availability and the starting
 * price alongside each name is also most of what decides the choice.
 */
export function GpuPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (gpuName: string) => void;
}) {
  const vastApiKey = useCloudCredentialsStore((s) => s.vastApiKey);
  const [gpus, setGpus] = useState<GpuChoice[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!vastApiKey) {
      setGpus([]);
      return;
    }
    let cancelled = false;
    listAvailableGpus(vastApiKey)
      .then((list) => !cancelled && setGpus(list))
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Could not load GPUs');
        setGpus([]);
      });
    return () => {
      cancelled = true;
    };
  }, [vastApiKey]);

  // Keep whatever the template already had, even if it's momentarily
  // unavailable — otherwise opening an old template silently changes its GPU.
  const options = [
    ...(value && !(gpus ?? []).some((g) => g.name === value)
      ? [{ value, label: value, description: 'Not available right now' }]
      : []),
    ...(gpus ?? []).map((gpu) => ({
      value: gpu.name,
      label: gpu.name,
      description: `${gpu.offerCount} available · from $${gpu.fromPrice.toFixed(2)}/hr${gpu.maxVramGb ? ` · up to ${gpu.maxVramGb} GB` : ''}`,
    })),
  ];

  return (
    <VStack space="xs">
      <Text className="text-sm font-medium text-typography-600">GPU</Text>
      <View>
        <OptionSelector
          value={value}
          onChange={onChange}
          options={options.length ? options : [{ value: '', label: 'Loading…' }]}
          title="Select GPU"
          searchPlaceholder="Search GPUs..."
        />
      </View>
      {error ? (
        <Text className="text-xs text-error-500">{error}</Text>
      ) : !vastApiKey ? (
        <Text className="text-xs text-typography-400">
          Add a vast.ai API key to see what&apos;s available.
        </Text>
      ) : (
        <Text className="text-xs text-typography-400">
          Sorted by how many are rentable now — a card with a handful of offers means little
          choice of price or location.
        </Text>
      )}
    </VStack>
  );
}
