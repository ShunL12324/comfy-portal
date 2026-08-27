import { Button, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { VStack } from '@/components/ui/vstack';
import {
  modelKey,
  retryModels,
  type SupervisorModel,
  type SupervisorSnapshot,
} from '@/services/cloud-supervisor';
import { formatBytes } from '@/services/model-url';
import { AlertTriangle, Check, RotateCw, X } from 'lucide-react-native';
import React, { useState } from 'react';

import { accruedCost, formatUptime, formatUsd } from '../utils/cost';
import type { LaunchRecord } from '../stores/provisioning-store';

/**
 * What the instance is doing, in the terms a person waiting on it cares about.
 *
 * Two different kinds of waiting are shown differently on purpose. Placing the
 * order and pulling the image have no measurable inside — the container does not
 * exist yet, so there is nothing to ask and a progress bar would be invented.
 * Downloads do have an inside, measured to the byte, so those get bars.
 */

const STAGE_LABELS: { id: string; label: string }[] = [
  { id: 'placing', label: 'Finding the machine a host' },
  { id: 'booting', label: 'Host is pulling the image' },
  { id: 'installing', label: 'Setting up' },
  { id: 'ready', label: 'Ready' },
];

const STEP_LABELS: Record<string, string> = {
  'link-directories': 'Preparing the disk',
  'disk-check': 'Checking there is room',
  aria2: 'Starting the downloader',
  extensions: 'Installing custom nodes',
  ollama: 'Pulling Ollama models',
  'comfyui-start': 'Starting ComfyUI',
};

export function LaunchProgress({ launch }: { launch: LaunchRecord }) {
  const snapshot = launch.snapshot;
  const stageIndex = STAGE_LABELS.findIndex((s) => s.id === launch.stage);

  return (
    <VStack space="lg">
      <CostBanner launch={launch} />

      {launch.error ? (
        <HStack space="sm" className="rounded-xl bg-error-50 p-4 items-start">
          <Icon as={AlertTriangle} size="sm" className="mt-0.5 text-error-500" />
          <Text className="text-sm text-error-700 flex-1">{launch.error}</Text>
        </HStack>
      ) : null}

      <VStack space="sm">
        {STAGE_LABELS.map((stage, index) => {
          const done = launch.stage === 'ready' ? true : stageIndex > index;
          const active = stageIndex === index && launch.stage !== 'failed';
          return (
            <HStack key={stage.id} space="sm" className="items-center">
              {active ? (
                <Spinner size="small" />
              ) : (
                <Icon
                  as={done ? Check : X}
                  size="xs"
                  className={done ? 'text-success-500' : 'text-typography-300'}
                />
              )}
              <Text
                className={`text-sm ${active ? 'text-typography-900' : done ? 'text-typography-500' : 'text-typography-300'}`}
              >
                {stage.label}
              </Text>
            </HStack>
          );
        })}
      </VStack>

      {/* Before the supervisor answers there is genuinely nothing to report, so
          vast's own words stand in rather than a fabricated bar. */}
      {!snapshot && launch.vastStatus ? (
        <Text className="text-xs text-typography-400" numberOfLines={2}>
          {launch.vastStatus}
        </Text>
      ) : null}

      {snapshot ? <SetupSteps snapshot={snapshot} /> : null}
      {snapshot?.models.length ? <ModelList launch={launch} snapshot={snapshot} /> : null}
      {snapshot ? <ServiceStatus snapshot={snapshot} /> : null}
    </VStack>
  );
}

function CostBanner({ launch }: { launch: LaunchRecord }) {
  // Rented hardware bills from the moment it is placed, including every minute
  // of the install, so this is never behind a tap.
  return (
    <HStack className="rounded-xl bg-background-50 p-4 items-center justify-between">
      <VStack space="xs">
        <Text className="text-xs text-typography-400">Running for</Text>
        <Text className="text-base font-medium text-typography-900">
          {formatUptime(launch.startedAt)}
        </Text>
      </VStack>
      <VStack space="xs" className="items-end">
        <Text className="text-xs text-typography-400">
          {formatUsd(launch.pricePerHour)}/hr
        </Text>
        <Text className="text-base font-medium text-warning-600">
          {formatUsd(accruedCost(launch.startedAt, launch.pricePerHour))}
        </Text>
      </VStack>
    </HStack>
  );
}

function SetupSteps({ snapshot }: { snapshot: SupervisorSnapshot }) {
  const steps = snapshot.steps.filter((step) => STEP_LABELS[step.id]);
  if (!steps.length) return null;

  return (
    <VStack space="xs">
      <Text className="text-xs font-medium text-typography-500">Setup</Text>
      {steps.map((step) => (
        <HStack key={step.id} className="items-center justify-between py-1">
          <HStack space="sm" className="items-center flex-1">
            {step.state === 'running' ? (
              <Spinner size="small" />
            ) : (
              <Icon
                as={step.state === 'done' ? Check : AlertTriangle}
                size="xs"
                className={step.state === 'done' ? 'text-success-500' : 'text-error-500'}
              />
            )}
            <Text className="text-sm text-typography-700">{STEP_LABELS[step.id]}</Text>
          </HStack>
          {step.ms != null ? (
            <Text className="text-xs text-typography-400">{formatDuration(step.ms)}</Text>
          ) : null}
        </HStack>
      ))}
    </VStack>
  );
}

function ModelList({
  launch,
  snapshot,
}: {
  launch: LaunchRecord;
  snapshot: SupervisorSnapshot;
}) {
  const [retrying, setRetrying] = useState<string | null>(null);
  const failed = snapshot.models.filter((m) => m.state === 'error');
  const { totals } = snapshot;

  const target =
    launch.host && launch.supervisorPort
      ? { host: launch.host, port: launch.supervisorPort, token: launch.token }
      : null;

  const retry = async (keys?: string[]) => {
    if (!target) return;
    setRetrying(keys?.[0] ?? 'all');
    try {
      await retryModels(target, keys);
    } catch {
      // The next poll shows whether it took; a failed retry request is not
      // worth its own error state.
    } finally {
      setRetrying(null);
    }
  };

  return (
    <VStack space="xs">
      <HStack className="items-center justify-between">
        <Text className="text-xs font-medium text-typography-500">
          Models ({snapshot.models.filter((m) => m.state === 'done').length}/
          {snapshot.models.length})
        </Text>
        <Text className="text-xs text-typography-400">
          {formatBytes(totals.completed)} / {formatBytes(totals.bytes)}
          {totals.speed > 0 ? ` · ${formatBytes(totals.speed)}/s` : ''}
          {totals.etaSeconds ? ` · ${formatDuration(totals.etaSeconds * 1000)} left` : ''}
        </Text>
      </HStack>

      {snapshot.stalled ? (
        <Text className="text-xs text-warning-600">
          No progress for a while — the host may be wedged. Destroying and trying another offer is
          usually faster than waiting.
        </Text>
      ) : null}

      {failed.length > 1 ? (
        <Button
          variant="outline"
          size="sm"
          onPress={() => retry()}
          isDisabled={retrying !== null}
          className="rounded-lg self-start"
        >
          <ButtonText className="text-xs">Retry all {failed.length} failed</ButtonText>
        </Button>
      ) : null}

      {snapshot.models.map((model) => (
        <ModelRow
          key={modelKey(model)}
          model={model}
          retrying={retrying === modelKey(model) || retrying === 'all'}
          onRetry={() => retry([modelKey(model)])}
        />
      ))}
    </VStack>
  );
}

function ModelRow({
  model,
  retrying,
  onRetry,
}: {
  model: SupervisorModel;
  retrying: boolean;
  onRetry: () => void;
}) {
  const ratio = model.total > 0 ? Math.min(1, model.completed / model.total) : 0;
  const failed = model.state === 'error';

  return (
    <VStack space="xs" className="rounded-xl bg-background-50 p-3">
      <HStack className="items-center justify-between">
        <Text className="text-sm text-typography-900 flex-1" numberOfLines={1}>
          {model.name}
        </Text>
        {failed ? (
          <Pressable onPress={onRetry} disabled={retrying} className="p-1">
            {retrying ? (
              <Spinner size="small" />
            ) : (
              <Icon as={RotateCw} size="xs" className="text-primary-500" />
            )}
          </Pressable>
        ) : model.state === 'done' ? (
          <Icon as={Check} size="xs" className="text-success-500" />
        ) : (
          <Text className="text-xs text-typography-400">
            {model.speed > 0 ? `${formatBytes(model.speed)}/s` : model.state}
          </Text>
        )}
      </HStack>

      {!failed ? (
        <>
          {/* A plain view rather than the Progress component: this is redrawn
              every couple of seconds for every model in the list. */}
          <View className="h-1 rounded-full bg-background-200 overflow-hidden">
            <View
              className={`h-1 rounded-full ${model.state === 'done' ? 'bg-success-500' : 'bg-primary-500'}`}
              style={{ width: `${Math.round(ratio * 100)}%` }}
            />
          </View>
          <Text className="text-xs text-typography-400">
            {model.folder} · {formatBytes(model.completed)}
            {model.total ? ` / ${formatBytes(model.total)}` : ''}
          </Text>
        </>
      ) : (
        <VStack space="xs">
          <Text className="text-xs text-error-600">{model.error}</Text>
          {model.hint ? (
            <Text className="text-xs text-typography-400">{model.hint}</Text>
          ) : null}
        </VStack>
      )}
    </VStack>
  );
}

function ServiceStatus({ snapshot }: { snapshot: SupervisorSnapshot }) {
  const entries = Object.entries(snapshot.services);
  if (!entries.length) return null;

  return (
    <VStack space="xs">
      <Text className="text-xs font-medium text-typography-500">Services</Text>
      {entries.map(([name, service]) => (
        <HStack key={name} className="items-center justify-between py-1">
          <HStack space="sm" className="items-center">
            <View
              className={`h-2 w-2 rounded-full ${service.state === 'running' ? 'bg-success-500' : 'bg-warning-500'}`}
            />
            <Text className="text-sm text-typography-700">
              {name === 'comfyui' ? 'ComfyUI' : name}
            </Text>
          </HStack>
          <Text className="text-xs text-typography-400">
            {service.state}
            {/* A restart count is the difference between "it crashed once at
                boot" and "it is crash-looping", which look identical otherwise. */}
            {service.restarts > 0 ? ` · restarted ${service.restarts}×` : ''}
          </Text>
        </HStack>
      ))}
    </VStack>
  );
}

function formatDuration(ms: number): string {
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ${seconds % 60}s`;
}
