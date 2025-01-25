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
import { Plus } from 'lucide-react-native';
import { AppBar } from '@/components/layout/app-bar';
import { AddPresetModal } from '@/components/add-preset-modal';
import { PresetCard } from '@/components/preset-card';

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
    <View className="flex-1 bg-background-0">
      <AppBar
        title="Presets"
        showBack
        bottomElement={
          <Button
            variant="solid"
            action="primary"
            size="md"
            className="mt-2 h-11 rounded-xl bg-background-50/80 backdrop-blur-sm active:bg-background-100/80"
            onPress={handleAddPreset}
          >
            <HStack space="sm" className="items-center justify-center">
              <Plus size={18} className="text-primary-500" />
              <Text className="text-sm font-medium text-primary-500">
                Add Preset
              </Text>
            </HStack>
          </Button>
        }
      />

      <ScrollView className="flex-1">
        <VStack space="md" className="px-5 pb-6">
          {filteredPresets.map((preset) => (
            <PresetCard
              key={preset.id}
              id={preset.id}
              name={preset.name}
              createdAt={preset.createdAt}
              thumbnail={preset.thumbnail}
              onPress={() => handleRunPreset(preset.id)}
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
