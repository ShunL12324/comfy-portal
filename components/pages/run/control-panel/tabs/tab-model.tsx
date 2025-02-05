import { ModelSelector } from '@/components/selectors/model';
import { Button, ButtonIcon, ButtonText } from '@/components/ui/button';
import { AddIcon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { usePresetsStore } from '@/store/presets';
import { useServersStore } from '@/store/servers';
import { LoraConfig } from '@/types/generation';
import { randomUUID } from 'expo-crypto';
import { ScrollView, View } from 'react-native';

interface TabModelProps {
  serverId: string;
  presetId: string;
}

export default function TabModel({ serverId, presetId }: TabModelProps) {
  // store values
  const servers = useServersStore((state) => state.servers);
  const preset = usePresetsStore((state) =>
    state.presets.find((p) => p.id === presetId),
  );
  const model = usePresetsStore(
    (state) => state.presets.find((p) => p.id === presetId)?.params.model,
  );
  const loras = usePresetsStore(
    (state) => state.presets.find((p) => p.id === presetId)?.params.loras,
  );
  // store actions
  const updatePreset = usePresetsStore((state) => state.updatePreset);

  const handleAddLora = () => {
    const lora: LoraConfig = {
      id: randomUUID(),
      name: '',
      strengthClip: 0.5,
      strengthModel: 0.5,
    };
    if (!preset?.params) return;
    updatePreset(presetId, {
      params: {
        ...preset.params,
        loras: [...(preset.params.loras || []), lora],
      },
    });
  };

  return (
    <ScrollView
      className="flex-1 bg-background-0"
      contentContainerStyle={{ gap: 16, padding: 16 }}
    >
      <View className="flex-row items-center justify-between">
        <Text size="sm" bold>
          Checkpoint
        </Text>
      </View>
      <ModelSelector
        value={model || ''}
        onChange={(value) => {
          if (preset?.params) {
            updatePreset(presetId, {
              params: { ...preset.params, model: value },
            });
          }
        }}
        type="checkpoints"
      />
      {/* loras picker */}

      <View className="flex-row items-center justify-between">
        <Text size="sm" bold>
          Loras
        </Text>
        <Button size="sm" variant="outline" onPress={handleAddLora}>
          <ButtonIcon as={AddIcon} />
          <ButtonText>Add Lora</ButtonText>
        </Button>
      </View>
      {loras?.map((lora) => (
        <ModelSelector
          key={lora.id}
          value={lora.name}
          onChange={(value) => {
            if (!preset?.params) return;
            updatePreset(presetId, {
              params: {
                ...preset.params,
                loras: preset.params.loras?.map((l) =>
                  l.id === lora.id ? { ...l, name: value } : l,
                ),
              },
            });
          }}
          type="loras"
          onLoraClipStrengthChange={(value) => {
            if (!preset?.params) return;
            updatePreset(presetId, {
              params: {
                ...preset.params,
                loras: preset.params.loras?.map((l) =>
                  l.id === lora.id ? { ...l, strengthClip: value } : l,
                ),
              },
            });
          }}
          onLoraModelStrengthChange={(value) => {
            if (!preset?.params) return;
            updatePreset(presetId, {
              params: {
                ...preset.params,
                loras: preset.params.loras?.map((l) =>
                  l.id === lora.id ? { ...l, strengthModel: value } : l,
                ),
              },
            });
          }}
          onDelete={() => {
            if (!preset?.params) return;
            updatePreset(presetId, {
              params: {
                ...preset.params,
                loras: preset.params.loras?.filter((l) => l.id !== lora.id),
              },
            });
          }}
        />
      ))}
    </ScrollView>
  );
}
