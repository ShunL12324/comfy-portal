import { ModelSelector } from '@/components/selectors/model';
import { Button } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { useServersStore } from '@/store/servers';
import { TabProps } from '@/types/generation';
import { Plus } from 'lucide-react-native';
import React from 'react';

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
              className="border-[0.5px] border-outline-100"
            >
              <Icon as={Plus} size="sm" className="text-typography-500" />
              <Text className="ml-1 text-sm text-typography-500">Add LoRA</Text>
            </Button>
          </HStack>

          <VStack space="sm">
            {params.loras?.map((lora, index) => (
              <ModelSelector
                key={index}
                value={lora.name}
                onDelete={() => {
                  const loras = [...(params.loras || [])];
                  loras.splice(index, 1);
                  onParamsChange({ ...params, loras });
                }}
                onChange={(value) => {
                  const loras = [...(params.loras || [])];
                  loras[index] = {
                    ...lora,
                    name: value,
                    strengthClip: lora.strengthClip ?? 1,
                    strengthModel: lora.strengthModel ?? 1,
                  };
                  onParamsChange({ ...params, loras });
                }}
                onLoraClipStrengthChange={(value) => {
                  const loras = [...(params.loras || [])];
                  loras[index] = { ...lora, strengthClip: value };
                  onParamsChange({ ...params, loras });
                }}
                onLoraModelStrengthChange={(value) => {
                  const loras = [...(params.loras || [])];
                  loras[index] = { ...lora, strengthModel: value };
                  onParamsChange({ ...params, loras });
                }}
                servers={servers}
                type="loras"
                initialClipStrength={lora.strengthClip}
                initialModelStrength={lora.strengthModel}
              />
            ))}
          </VStack>
        </VStack>
      </VStack>
    </VStack>
  );
}
