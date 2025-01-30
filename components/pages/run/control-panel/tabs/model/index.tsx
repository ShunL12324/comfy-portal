import { ModelSelector } from '@/components/selectors/model';
import { Button } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { useServersStore } from '@/store/servers';
import { LoraConfig, TabProps } from '@/types/generation';
import * as Crypto from 'expo-crypto';
import { Plus } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';

interface ModelTabProps extends TabProps {
  serverId: string;
}

const DEFAULT_LORA: Omit<LoraConfig, 'id'> = {
  name: '',
  strengthModel: 1,
  strengthClip: 1,
};

/**
 * Model selection tab component
 * Displays a button to open a bottom sheet modal with a list of available checkpoint models
 * Each model item shows a preview image (if available), model name, and server name
 */
export function ModelTab({ params, onParamsChange, serverId }: ModelTabProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const server = useServersStore((state) =>
    state.servers.find((s) => s.id === serverId),
  );
  const refreshServer = useServersStore((state) => state.refreshServer);

  const updateLora = useCallback(
    (loraId: string, updates: Partial<LoraConfig>) => {
      const loras = [...(params.loras || [])];
      const index = loras.findIndex((l) => l.id === loraId);
      if (index !== -1) {
        loras[index] = { ...loras[index], ...updates };
        onParamsChange({ ...params, loras });
      }
    },
    [params, onParamsChange],
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshServer(serverId);
    } finally {
      setIsRefreshing(false);
    }
  };

  if (!server) {
    return (
      <VStack
        space="lg"
        className="flex-1 items-center justify-center px-4 py-4"
      >
        <Text className="text-base text-error-500">Server not found</Text>
      </VStack>
    );
  }

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
            servers={[server]}
            onRefresh={handleRefresh}
            isRefreshing={isRefreshing}
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
                    {
                      id: Crypto.randomUUID(),
                      ...DEFAULT_LORA,
                    },
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
            {params.loras?.map((lora) => (
              <ModelSelector
                key={lora.id}
                value={lora.name}
                onDelete={() => {
                  const loras = (params.loras || []).filter(
                    (l) => l.id !== lora.id,
                  );
                  onParamsChange({ ...params, loras });
                }}
                onChange={(value) => updateLora(lora.id, { name: value })}
                onLoraClipStrengthChange={(value) =>
                  updateLora(lora.id, { strengthClip: value })
                }
                onLoraModelStrengthChange={(value) =>
                  updateLora(lora.id, { strengthModel: value })
                }
                servers={[server]}
                type="loras"
                initialClipStrength={lora.strengthClip}
                initialModelStrength={lora.strengthModel}
                onRefresh={handleRefresh}
                isRefreshing={isRefreshing}
              />
            ))}
          </VStack>
        </VStack>
      </VStack>
    </VStack>
  );
}
