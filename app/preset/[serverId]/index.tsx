import { AppBar } from '@/components/layout/app-bar';
import { AddPresetModal } from '@/components/pages/preset/add-preset-modal';
import { PresetCard } from '@/components/pages/preset/preset-card';
import { Button } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { AddIcon, Icon } from '@/components/ui/icon';
import { ScrollView } from '@/components/ui/scroll-view';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { VStack } from '@/components/ui/vstack';
import { usePresetsStore } from '@/store/presets';
import { useServersStore } from '@/store/servers';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';

const PresetsScreen = () => {
  const { serverId } = useLocalSearchParams();
  const server = useServersStore((state) =>
    state.servers.find((s) => s.id === serverId),
  );
  const presets = usePresetsStore((state) => state.presets);
  const router = useRouter();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const handleAddPreset = () => {
    setIsAddModalOpen(true);
  };

  const handleRunPreset = (presetId: string) => {
    router.push(`/preset/${serverId}/run/${presetId}`);
  };

  if (!server) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-primary-300">Server not found</Text>
      </View>
    );
  }

  const filteredPresets = presets.filter(
    (preset) => preset.serverId === serverId,
  );

  return (
    <View className={`flex-1 bg-background-0`}>
      <AppBar
        title="Presets"
        showBack
        bottomElement={
          <Button
            variant="solid"
            action="primary"
            size="md"
            className="mt-2 h-11 rounded-xl bg-background-200 data-[focus=true]:bg-background-0 data-[active=true]:bg-background-0"
            onPress={handleAddPreset}
          >
            <HStack space="sm" className="items-center justify-center">
              <Icon as={AddIcon} size="md" className="text-accent-500" />
              <Text className="text-sm font-medium text-typography-900">
                Add Preset
              </Text>
            </HStack>
          </Button>
        }
      />

      <ScrollView className="flex-1">
        <VStack space="md" className="px-5 pb-6">
          {filteredPresets.map((preset, index) => (
            <PresetCard
              key={preset.id}
              id={preset.id}
              name={preset.name}
              createdAt={preset.createdAt}
              thumbnail={preset.thumbnail}
              lastUsed={preset.lastUsed}
              params={preset.params}
              serverId={serverId as string}
              onPress={() => handleRunPreset(preset.id)}
              index={index}
            />
          ))}
        </VStack>
      </ScrollView>

      <AddPresetModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        serverId={serverId as string}
      />
    </View>
  );
};

export default PresetsScreen;
