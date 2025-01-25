import React from 'react';
import { VStack } from '@/components/ui/vstack';
import { Text } from '@/components/ui/text';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { TabProps, SAMPLERS, SCHEDULERS } from '../types';

export function SamplerTab({ params, onParamsChange }: TabProps) {
  return (
    <VStack space="lg" className="px-4 py-4">
      <VStack space="sm">
        <Text className="text-base font-medium text-primary-500">Sampler</Text>
        <SegmentedControl
          options={[...SAMPLERS]}
          value={params.sampler}
          onChange={(value: string) =>
            onParamsChange({
              ...params,
              sampler: value as (typeof SAMPLERS)[number],
            })
          }
        />
      </VStack>

      <VStack space="sm">
        <Text className="text-base font-medium text-primary-500">
          Scheduler
        </Text>
        <SegmentedControl
          options={[...SCHEDULERS]}
          value={params.scheduler}
          onChange={(value: string) =>
            onParamsChange({
              ...params,
              scheduler: value as (typeof SCHEDULERS)[number],
            })
          }
        />
      </VStack>
    </VStack>
  );
}
