import React, { useCallback } from 'react';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Plus } from 'lucide-react-native';
import { useServersStore } from '@/store/servers';
import { TabProps } from '../types';
import { ModelSelector } from '@/components/selectors/model';

/**
 * Model selection tab component
 * Displays a button to open a bottom sheet modal with a list of available checkpoint models
 * Each model item shows a preview image (if available), model name, and server name
 */
export function ModelTab({ params, onParamsChange }: TabProps) {
  const servers = useServersStore((state) => state.servers);
  const refreshServers = useServersStore((state) => state.refreshServers);

  return (
    <VStack space="lg" className="flex-1 px-4 py-4">
      <VStack space="lg">
        {/* Checkpoint Section */}
        <VStack space="sm">
          <Text className="text-base font-medium text-primary-500">
            Checkpoint
          </Text>
          <ModelSelector
            value={params.model}
            onChange={(value) => onParamsChange({ ...params, model: value })}
            servers={servers}
            onRefresh={refreshServers}
            type="checkpoints"
          />
        </VStack>

        {/* LoRA Section */}
        <VStack space="sm">
          <HStack space="sm" className="items-center justify-between">
            <Text className="text-base font-medium text-primary-500">LoRA</Text>
            <Button
              variant="outline"
              size="sm"
              onPress={() =>
                onParamsChange({
                  ...params,
                  loras: [
                    ...(params.loras || []),
                    { name: '', strengthModel: 1, strengthClip: 1 },
                  ],
                })
              }
              className="border-[0.5px] border-background-100"
            >
              <Icon as={Plus} size="sm" className="text-primary-500" />
              <Text className="ml-1 text-sm text-primary-500">Add LoRA</Text>
            </Button>
          </HStack>

          <VStack space="sm">
            {params.loras?.map((lora, index) => (
              <ModelSelector
                key={index}
                value={lora.name}
                onChange={(value) => {
                  const loras = [...(params.loras || [])];
                  loras[index] = { ...lora, name: value };
                  onParamsChange({ ...params, loras });
                }}
                servers={servers}
                type="loras"
              />
            ))}
          </VStack>
        </VStack>
      </VStack>
    </VStack>
  );
}
