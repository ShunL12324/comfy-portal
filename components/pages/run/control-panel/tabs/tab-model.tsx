import { ModelSelector } from '@/components/selectors/model';
import { Button, ButtonIcon, ButtonText } from '@/components/ui/button';
import { AddIcon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { usePresetsStore } from '@/store/presets';
import { LoraConfig } from '@/types/preset';
import { randomUUID } from 'expo-crypto';
import { ScrollView, View } from 'react-native';

interface TabModelProps {
  serverId: string;
  presetId: string;
}

export default function TabModel({ serverId, presetId }: TabModelProps) {
  // store values
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
      strengthClip: 1,
      strengthModel: 1,
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
        serverId={serverId}
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
          serverId={serverId}
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
          initialClipStrength={lora.strengthClip}
          initialModelStrength={lora.strengthModel}
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
