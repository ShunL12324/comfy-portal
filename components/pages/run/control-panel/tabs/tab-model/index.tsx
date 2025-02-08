import { ModelSelector } from '@/components/selectors/model';
import { Button, ButtonIcon, ButtonText } from '@/components/ui/button';
import { AddIcon } from '@/components/ui/icon';
import { usePresetsStore } from '@/store/presets';
import { LoraConfig } from '@/types/preset';
import { randomUUID } from 'expo-crypto';
import React from 'react';
import { View } from 'react-native';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { TabItem } from '../common';
import MainModelSelector from './main-model-selector';

interface AnimatedLoraProps {
  lora: LoraConfig;
  serverId: string;
  onUpdate: (updates: Partial<LoraConfig>) => void;
  onDelete: () => void;
}

function AnimatedLora({ lora, serverId, onUpdate, onDelete }: AnimatedLoraProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);

  React.useEffect(() => {
    opacity.value = withTiming(1, { duration: 150 });
    translateY.value = withTiming(0, { duration: 150 });
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [{ translateY: translateY.value }],
    };
  });

  const handleDelete = () => {
    opacity.value = withTiming(0, { duration: 150 });
    translateY.value = withTiming(-20, { duration: 150 }, (finished) => {
      if (finished) {
        runOnJS(onDelete)();
      }
    });
  };

  return (
    <Animated.View style={animatedStyle}>
      <ModelSelector
        serverId={serverId}
        value={lora.name}
        onChange={(value) => onUpdate({ name: value })}
        type="loras"
        initialClipStrength={lora.strengthClip}
        initialModelStrength={lora.strengthModel}
        onLoraClipStrengthChange={(value) => onUpdate({ strengthClip: value })}
        onLoraModelStrengthChange={(value) => onUpdate({ strengthModel: value })}
        onDelete={handleDelete}
      />
    </Animated.View>
  );
}

interface TabModelProps {
  serverId: string;
  presetId: string;
}

export default function TabModel({ serverId, presetId }: TabModelProps) {
  // store values
  const preset = usePresetsStore((state) => state.presets.find((p) => p.id === presetId));
  const loras = usePresetsStore((state) => state.presets.find((p) => p.id === presetId)?.params.loras);

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

  const handleUpdateLora = (loraId: string, updates: Partial<LoraConfig>) => {
    if (!preset?.params) return;
    updatePreset(presetId, {
      params: {
        ...preset.params,
        loras: preset.params.loras?.map((l) => (l.id === loraId ? { ...l, ...updates } : l)),
      },
    });
  };

  const handleDeleteLora = (loraId: string) => {
    if (!preset?.params) return;
    updatePreset(presetId, {
      params: {
        ...preset.params,
        loras: preset.params.loras?.filter((l) => l.id !== loraId),
      },
    });
  };

  return (
    <Animated.ScrollView className="flex-1 bg-background-0" contentContainerStyle={{ gap: 16, padding: 16 }}>
      <TabItem title="Main Model">
        <MainModelSelector serverId={serverId} presetId={presetId} />
      </TabItem>

      <TabItem
        title="Loras"
        titleRight={
          <Button size="sm" variant="outline" onPress={handleAddLora}>
            <ButtonIcon as={AddIcon} />
            <ButtonText>Add Lora</ButtonText>
          </Button>
        }
      >
        <View className="flex flex-col gap-4">
          {loras?.map((lora) => (
            <AnimatedLora
              key={lora.id}
              lora={lora}
              serverId={serverId}
              onUpdate={(updates) => handleUpdateLora(lora.id, updates)}
              onDelete={() => handleDeleteLora(lora.id)}
            />
          ))}
        </View>
      </TabItem>
    </Animated.ScrollView>
  );
}
