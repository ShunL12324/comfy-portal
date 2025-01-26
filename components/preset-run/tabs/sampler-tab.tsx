import React from 'react';
import { VStack } from '@/components/ui/vstack';
import { Text } from '@/components/ui/text';
import { TabProps } from '../types';
import { SamplerSelector } from '@/components/selectors/sampler';
import { SchedulerSelector } from '@/components/selectors/scheduler';

export function SamplerTab({ params, onParamsChange }: TabProps) {
  return (
    <VStack space="lg" className="px-4 py-4">
      <VStack space="sm">
        <Text className="text-base font-medium text-primary-500">Sampler</Text>
        <SamplerSelector
          value={params.sampler}
          onChange={(value) =>
            onParamsChange({
              ...params,
              sampler: value,
            })
          }
        />
      </VStack>

      <VStack space="sm">
        <Text className="text-base font-medium text-primary-500">
          Scheduler
        </Text>
        <SchedulerSelector
          value={params.scheduler}
          onChange={(value) =>
            onParamsChange({
              ...params,
              scheduler: value,
            })
          }
        />
      </VStack>
    </VStack>
  );
}
