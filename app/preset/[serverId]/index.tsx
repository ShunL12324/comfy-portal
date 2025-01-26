import React, { useState } from 'react';
import { ScrollView } from '@/components/ui/scroll-view';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { Button } from '@/components/ui/button';
import { usePresetsStore } from '@/store/presets';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useServersStore } from '@/store/servers';
import { Icon, AddIcon } from '@/components/ui/icon';
import { AppBar } from '@/components/layout/app-bar';
import { AddPresetModal } from '@/components/add-preset-modal';
import { PresetCard } from '@/components/preset-card';
import { useThemeStore } from '@/store/theme';

const PresetsScreen = () => {
  const { theme } = useThemeStore();
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
