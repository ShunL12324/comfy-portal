import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { RotatingSpinner } from '@/components/ui/rotating-spinner';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { formatBytes } from '@/services/model-url';
import { router } from 'expo-router';
import { AlertTriangle, Cloud } from 'lucide-react-native';
import { MotiView } from 'moti';
import React from 'react';
import { TouchableOpacity, View } from 'react-native';

import type { LaunchRecord } from '../stores/provisioning-store';
import { accruedCost, formatUptime, formatUsd } from '../utils/cost';

const STAGE_LABELS: Record<LaunchRecord['stage'], string> = {
  placing: 'Finding a host…',
  booting: 'Booting…',
  installing: 'Installing…',
  ready: 'Ready',
  failed: 'Failed',
};

/**
 * A rented instance that hasn't reached `ready` yet, shown on Home alongside
 * regular servers so progress (and cost) stays visible no matter which screen
 * started the launch or how long ago. Once `ready`, the launch is registered
 * as a real Server and this card is replaced by a normal ServerCard.
 */
export function LaunchCard({ launch, index = 0 }: { launch: LaunchRecord; index?: number }) {
  const failed = launch.stage === 'failed';
  const snapshot = launch.snapshot;
  const modelSummary =
    snapshot && snapshot.models.length
      ? `Models ${snapshot.models.filter((m) => m.state === 'done').length}/${snapshot.models.length}`
      : null;

  return (
    <MotiView
      from={{ opacity: 0, scale: 0.98, translateY: 10 }}
      animate={{ opacity: 1, scale: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 300, delay: index * 100 }}
    >
      <TouchableOpacity
        onPress={() => router.push(`/cloud/launch-status/${launch.instanceId}`)}
        activeOpacity={0.8}
        className="overflow-hidden rounded-xl bg-surface-raised p-3.5"
      >
        <HStack space="md" className="flex-1 items-center">
          <View className="h-16 w-16 items-center justify-center rounded-lg bg-surface-base p-2">
            {failed ? (
              <Icon as={AlertTriangle} size="xl" className="text-status-danger" />
            ) : (
              <RotatingSpinner size="sm" />
            )}
          </View>
          <VStack space="xs" className="flex-1">
            <HStack space="sm" className="items-center">
              <Icon as={Cloud} size="xs" className="text-action" />
              <Text className="flex-1 text-base font-semibold text-content-primary" numberOfLines={1}>
                {launch.templateName}
              </Text>
            </HStack>
            <Text className="text-xs text-content-secondary" numberOfLines={1}>
              {failed ? launch.error || 'Failed' : [STAGE_LABELS[launch.stage], modelSummary].filter(Boolean).join(' · ')}
            </Text>
            {!failed && snapshot?.totals.speed ? (
              <Text className="text-xs text-content-tertiary" numberOfLines={1}>
                {formatBytes(snapshot.totals.speed)}/s
              </Text>
            ) : null}
            <Text className={`text-xs ${failed ? 'text-status-danger' : 'text-warning-600'}`} numberOfLines={1}>
              {formatUptime(launch.startedAt)} · {formatUsd(accruedCost(launch.startedAt, launch.pricePerHour))} so far ·{' '}
              {formatUsd(launch.pricePerHour)}/hr
            </Text>
          </VStack>
        </HStack>
      </TouchableOpacity>
    </MotiView>
  );
}
