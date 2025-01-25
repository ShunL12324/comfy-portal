import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, Pressable, useWindowDimensions, ScrollView } from 'react-native';
import { VStack } from '@/components/ui/vstack';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import {
  ChevronDown,
  Search,
  FileQuestion,
  ImageIcon,
  Plus,
  Minus,
  RefreshCw,
} from 'lucide-react-native';
import { BottomSheetModal, BottomSheetFlatList } from '@gorhom/bottom-sheet';
import { useServersStore } from '@/store/servers';
import { ModelItem } from '../model-item';
import { TabProps } from '../types';
import { Input, InputField } from '@/components/ui/input';
import { Box } from '@/components/ui/box';
import { Center } from '@/components/ui/center';
import { HStack } from '@/components/ui/hstack';
import { Image } from 'react-native';
import {
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
} from '@/components/ui/slider';
import { LoraConfig } from '@/types/generation';
import { checkMultipleServers } from '@/utils/server-status';
import { Spinner } from '@/components/ui/spinner';

/**
 * Model selection tab component
 * Displays a button to open a bottom sheet modal with a list of available checkpoint models
 * Each model item shows a preview image (if available), model name, and server name
 */
export function ModelTab({ params, onParamsChange }: TabProps) {
  const { width: windowWidth } = useWindowDimensions();
  const servers = useServersStore((state) => state.servers);
  const refreshServers = useServersStore((state) => state.refreshServers);
  const checkpointModalRef = useRef<BottomSheetModal>(null);
  const loraModalRef = useRef<BottomSheetModal>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLoraIndex, setSelectedLoraIndex] = useState<number>(-1);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const checkpointModels = servers.flatMap((server, serverIndex) =>
    (server.models || [])
      .filter((model) => model.type === 'checkpoints')
      .map((model, modelIndex) => ({
        label: `${model.name} (${server.name})`,
        value: model.name,
        key: `${server.id}_${model.type}_${serverIndex}_${modelIndex}_${model.name}`,
        model,
        serverName: server.name,
      }))
      .filter(
        (model, index, self) =>
          index === self.findIndex((m) => m.label === model.label),
      ),
  );

  const loraModels = servers.flatMap((server, serverIndex) =>
    (server.models || [])
      .filter((model) => model.type === 'loras')
      .map((model, modelIndex) => ({
        label: `${model.name} (${server.name})`,
        value: model.name,
        key: `${server.id}_${model.type}_${serverIndex}_${modelIndex}_${model.name}`,
        model,
        serverName: server.name,
      }))
      .filter(
        (model, index, self) =>
          index === self.findIndex((m) => m.label === model.label),
      ),
  );

  const filteredModels = useMemo(() => {
    const models = selectedLoraIndex === -1 ? checkpointModels : loraModels;
    return models.filter((model) =>
      model.label.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [checkpointModels, loraModels, searchQuery, selectedLoraIndex]);

  const selectedModel = checkpointModels.find(
    (model) => model.value === params.model,
  );

  const handlePresentCheckpointPress = useCallback(() => {
    setSelectedLoraIndex(-1);
    checkpointModalRef.current?.present();
  }, []);

  const handlePresentLoraPress = useCallback((index: number) => {
    setSelectedLoraIndex(index);
    loraModalRef.current?.present();
  }, []);

  const handleModelSelect = useCallback(
    (model: string) => {
      if (selectedLoraIndex === -1) {
        // Checkpoint selection
        onParamsChange({ ...params, model });
        checkpointModalRef.current?.dismiss();
      } else {
        // LoRA selection
        const loras = [...(params.loras || [])];
        const newLora: LoraConfig = {
          name: model,
          strengthModel: 1,
          strengthClip: 1,
        };

        if (selectedLoraIndex < loras.length) {
          loras[selectedLoraIndex] = newLora;
        } else {
          loras.push(newLora);
        }

        onParamsChange({ ...params, loras });
        loraModalRef.current?.dismiss();
      }
    },
    [params, onParamsChange, selectedLoraIndex],
  );

  const handleLoraStrengthChange = useCallback(
    (index: number, type: 'model' | 'clip', value: number) => {
      const loras = [...(params.loras || [])];
      if (index < loras.length) {
        loras[index] = {
          ...loras[index],
          [type === 'model' ? 'strengthModel' : 'strengthClip']: value,
        };
        onParamsChange({ ...params, loras });
      }
    },
    [params, onParamsChange],
  );

  const handleRemoveLora = useCallback(
    (index: number) => {
      const loras = [...(params.loras || [])];
      loras.splice(index, 1);
      onParamsChange({ ...params, loras });
    },
    [params, onParamsChange],
  );

  const handleRefreshModels = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      await refreshServers();
    } catch (error) {
      console.error('Failed to refresh models:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshServers, isRefreshing]);

  // Calculate item width based on window width
  const itemWidth = (windowWidth - 32 - 8) / 2; // 32 for padding, 8 for gap

  const ListEmptyComponent = useCallback(
    () => (
      <Center className="h-[50vh] px-4">
        <Icon
          as={FileQuestion}
          size="xl"
          className="mb-2 text-background-200"
        />
        <Text className="text-base font-medium text-primary-500">
          No models found
        </Text>
        <Text className="text-sm text-background-400">
          Try a different search term
        </Text>
      </Center>
    ),
    [],
  );

  const renderLoraItem = useCallback(
    (lora: LoraConfig, index: number) => {
      const loraModel = loraModels.find((model) => model.value === lora.name);

      return (
        <Box className="mb-2 overflow-hidden rounded-xl border-[0.5px] border-background-100 bg-background-50">
          <VStack space="sm" className="p-3">
            <HStack space="sm" className="items-center justify-between">
              <HStack space="sm" className="flex-1 items-center">
                <Box className="h-10 w-10 overflow-hidden rounded-lg border-[0.5px] border-background-100">
                  {loraModel?.model.hasPreview &&
                  loraModel.model.previewPath ? (
                    <Image
                      source={{
                        uri: loraModel.model.previewPath.startsWith('file://')
                          ? loraModel.model.previewPath
                          : `file://${loraModel.model.previewPath}`,
                      }}
                      alt={loraModel.model.name}
                      className="h-full w-full"
                      resizeMode="cover"
                    />
                  ) : (
                    <Box className="h-full w-full items-center justify-center bg-background-50">
                      <Icon
                        as={ImageIcon}
                        size="sm"
                        className="text-primary-300"
                      />
                    </Box>
                  )}
                </Box>
                <VStack space="xs" className="flex-1">
                  <Text
                    className="text-sm font-medium text-primary-500"
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {loraModel?.model.name.replace(/\.[^/.]+$/, '') ||
                      lora.name.replace(/\.[^/.]+$/, '')}
                  </Text>
                  <Text className="text-xs text-background-400">
                    {loraModel?.serverName || 'Unknown server'}
                  </Text>
                </VStack>
              </HStack>
              <HStack space="sm">
                <Pressable
                  onPress={() => handleRemoveLora(index)}
                  className="h-7 w-7 items-center justify-center rounded-lg border-[0.5px] border-background-100 bg-background-50 active:bg-background-100"
                >
                  <Icon as={Minus} size="sm" className="text-background-400" />
                </Pressable>
              </HStack>
            </HStack>

            <VStack space="xs">
              <HStack space="sm" className="items-center justify-between">
                <Text className="text-xs text-background-400">
                  Model Strength
                </Text>
                <Text className="text-xs text-primary-500">
                  {lora.strengthModel.toFixed(2)}
                </Text>
              </HStack>
              <HStack space="sm" className="items-center">
                <Button
                  variant="outline"
                  className="h-8 w-8 rounded-xl bg-background-50 p-0"
                  onPress={() =>
                    handleLoraStrengthChange(
                      index,
                      'model',
                      Math.max(0, lora.strengthModel - 0.1),
                    )
                  }
                >
                  <Icon as={Minus} size="sm" className="text-primary-500" />
                </Button>
                <Input className="flex-1 overflow-hidden rounded-xl border-[0.5px] border-background-100">
                  <InputField
                    value={lora.strengthModel.toFixed(2)}
                    onChangeText={(value: string) => {
                      const num = Number(value);
                      if (!isNaN(num)) {
                        handleLoraStrengthChange(
                          index,
                          'model',
                          Math.min(2, Math.max(0, num)),
                        );
                      }
                    }}
                    keyboardType="numeric"
                    className="bg-background-50 p-3 text-center text-sm text-primary-500"
                  />
                </Input>
                <Button
                  variant="outline"
                  className="h-8 w-8 rounded-xl bg-background-50 p-0"
                  onPress={() =>
                    handleLoraStrengthChange(
                      index,
                      'model',
                      Math.min(2, lora.strengthModel + 0.1),
                    )
                  }
                >
                  <Icon as={Plus} size="sm" className="text-primary-500" />
                </Button>
              </HStack>
            </VStack>

            <VStack space="xs">
              <HStack space="sm" className="items-center justify-between">
                <Text className="text-xs text-background-400">
                  CLIP Strength
                </Text>
                <Text className="text-xs text-primary-500">
                  {lora.strengthClip.toFixed(2)}
                </Text>
              </HStack>
              <HStack space="sm" className="items-center">
                <Button
                  variant="outline"
                  className="h-8 w-8 rounded-xl bg-background-50 p-0"
                  onPress={() =>
                    handleLoraStrengthChange(
                      index,
                      'clip',
                      Math.max(0, lora.strengthClip - 0.1),
                    )
                  }
                >
                  <Icon as={Minus} size="sm" className="text-primary-500" />
                </Button>
                <Input className="flex-1 overflow-hidden rounded-xl border-[0.5px] border-background-100">
                  <InputField
                    value={lora.strengthClip.toFixed(2)}
                    onChangeText={(value: string) => {
                      const num = Number(value);
                      if (!isNaN(num)) {
                        handleLoraStrengthChange(
                          index,
                          'clip',
                          Math.min(2, Math.max(0, num)),
                        );
                      }
                    }}
                    keyboardType="numeric"
                    className="bg-background-50 p-3 text-center text-sm text-primary-500"
                  />
                </Input>
                <Button
                  variant="outline"
                  className="h-8 w-8 rounded-xl bg-background-50 p-0"
                  onPress={() =>
                    handleLoraStrengthChange(
                      index,
                      'clip',
                      Math.min(2, lora.strengthClip + 0.1),
                    )
                  }
                >
                  <Icon as={Plus} size="sm" className="text-primary-500" />
                </Button>
              </HStack>
            </VStack>
          </VStack>
        </Box>
      );
    },
    [
      handleLoraStrengthChange,
      handlePresentLoraPress,
      handleRemoveLora,
      loraModels,
    ],
  );

  return (
    <VStack space="lg" className="flex-1 px-4 py-4">
      <VStack space="lg">
        {/* Checkpoint Section */}
        <VStack space="sm">
          <Text className="text-base font-medium text-primary-500">
            Checkpoint
          </Text>
          <Pressable
            onPress={handlePresentCheckpointPress}
            className="active:opacity-80"
          >
            <Box className="overflow-hidden rounded-xl border-[0.5px] border-background-100 bg-background-50">
              <HStack space="sm" className="items-center justify-between p-3">
                <HStack space="sm" className="flex-1 items-center">
                  {selectedModel ? (
                    <>
                      <Box className="h-10 w-10 overflow-hidden rounded-lg border-[0.5px] border-background-100">
                        {selectedModel.model.hasPreview &&
                        selectedModel.model.previewPath ? (
                          <Image
                            source={{
                              uri: selectedModel.model.previewPath.startsWith(
                                'file://',
                              )
                                ? selectedModel.model.previewPath
                                : `file://${selectedModel.model.previewPath}`,
                            }}
                            alt={selectedModel.model.name}
                            className="h-full w-full"
                            resizeMode="cover"
                          />
                        ) : (
                          <Box className="h-full w-full items-center justify-center bg-background-50">
                            <Icon
                              as={ImageIcon}
                              size="sm"
                              className="text-primary-300"
                            />
                          </Box>
                        )}
                      </Box>
                      <VStack space="xs" className="flex-1">
                        <Text
                          className="text-sm font-medium text-primary-500"
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {selectedModel.model.name.replace(/\.[^/.]+$/, '')}
                        </Text>
                        <Text className="text-xs text-background-400">
                          {selectedModel.serverName}
                        </Text>
                      </VStack>
                    </>
                  ) : (
                    <>
                      <Box className="h-10 w-10 items-center justify-center rounded-lg border-[0.5px] border-background-100 bg-background-50">
                        <Icon
                          as={ImageIcon}
                          size="sm"
                          className="text-primary-300"
                        />
                      </Box>
                      <VStack space="xs" className="flex-1">
                        <Text className="text-sm font-medium text-primary-500">
                          Select checkpoint
                        </Text>
                        <Text className="text-xs text-background-400">
                          Choose a checkpoint model
                        </Text>
                      </VStack>
                    </>
                  )}
                </HStack>
                <Icon
                  as={ChevronDown}
                  size="sm"
                  className="text-background-400"
                />
              </HStack>
            </Box>
          </Pressable>
        </VStack>

        {/* LoRA Section */}
        <VStack space="sm">
          <HStack space="sm" className="items-center justify-between">
            <Text className="text-base font-medium text-primary-500">LoRA</Text>
            <Button
              variant="outline"
              size="sm"
              onPress={() =>
                handlePresentLoraPress((params.loras || []).length)
              }
              className="border-[0.5px] border-background-100"
            >
              <Icon as={Plus} size="sm" className="text-primary-500" />
              <Text className="ml-1 text-sm text-primary-500">Add LoRA</Text>
            </Button>
          </HStack>

          <VStack space="sm">
            {params.loras?.map((lora, index) => renderLoraItem(lora, index))}
          </VStack>
        </VStack>
      </VStack>

      {/* Checkpoint Modal */}
      <BottomSheetModal
        ref={checkpointModalRef}
        snapPoints={['85%']}
        index={0}
        backgroundComponent={() => <View className="flex-1 bg-background-0" />}
        handleComponent={() => (
          <View className="-mb-1 h-8 items-center justify-center rounded-t-[24px] bg-background-0">
            <View className="h-1 w-12 rounded-full bg-background-300" />
          </View>
        )}
      >
        <View className="flex-1 bg-background-0">
          <Text
            className="pb-2 pt-4 text-lg font-medium text-primary-500"
            style={{ paddingHorizontal: 16 }}
          >
            Select Model
          </Text>

          <Box className="pb-4" style={{ paddingHorizontal: 16 }}>
            <HStack space="sm" className="items-center">
              <Box className="flex-1 overflow-hidden rounded-lg border-[0.5px] border-background-100 bg-background-50">
                <Input
                  variant="outline"
                  size="md"
                  className="border-0 px-3 py-2"
                >
                  <Icon
                    as={Search}
                    size="sm"
                    className="mr-2 text-background-400"
                  />
                  <InputField
                    placeholder="Search models..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    className="flex-1 text-sm text-primary-500"
                    placeholderTextColor="rgb(115, 115, 115)"
                    autoCapitalize="none"
                    autoCorrect={false}
                    clearButtonMode="while-editing"
                  />
                </Input>
              </Box>
              <Button
                variant="outline"
                size="md"
                onPress={handleRefreshModels}
                className="aspect-square rounded-lg border-[0.5px] border-background-100 bg-background-50 p-0"
              >
                {isRefreshing ? (
                  <Spinner size="small" className="text-background-400" />
                ) : (
                  <Icon
                    as={RefreshCw}
                    size="sm"
                    className="text-background-400"
                  />
                )}
              </Button>
            </HStack>
          </Box>

          <BottomSheetFlatList
            data={filteredModels}
            keyExtractor={(item) => item.key}
            numColumns={2}
            ListEmptyComponent={ListEmptyComponent}
            columnWrapperStyle={{
              gap: 8,
              paddingHorizontal: 16,
            }}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => handleModelSelect(item.value)}
                className="active:opacity-80"
                style={{ width: itemWidth }}
              >
                <ModelItem
                  model={item.model}
                  serverName={item.serverName}
                  isSelected={
                    selectedLoraIndex === -1
                      ? params.model === item.value
                      : params.loras?.[selectedLoraIndex]?.name === item.value
                  }
                />
              </Pressable>
            )}
            contentContainerStyle={{
              flexGrow: 1,
              paddingBottom: 34,
              gap: 16,
            }}
          />
        </View>
      </BottomSheetModal>

      {/* LoRA Modal */}
      <BottomSheetModal
        ref={loraModalRef}
        snapPoints={['85%']}
        index={0}
        backgroundComponent={() => <View className="flex-1 bg-background-0" />}
        handleComponent={() => (
          <View className="-mb-1 h-8 items-center justify-center rounded-t-[24px] bg-background-0">
            <View className="h-1 w-12 rounded-full bg-background-300" />
          </View>
        )}
      >
        <View className="flex-1 bg-background-0">
          <Text
            className="pb-2 pt-4 text-lg font-medium text-primary-500"
            style={{ paddingHorizontal: 16 }}
          >
            Select LoRA
          </Text>

          <Box className="pb-4" style={{ paddingHorizontal: 16 }}>
            <HStack space="sm" className="items-center">
              <Box className="flex-1 overflow-hidden rounded-lg border-[0.5px] border-background-100 bg-background-50">
                <Input
                  variant="outline"
                  size="md"
                  className="border-0 px-3 py-2"
                >
                  <Icon
                    as={Search}
                    size="sm"
                    className="mr-2 text-background-400"
                  />
                  <InputField
                    placeholder="Search LoRAs..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    className="flex-1 text-sm text-primary-500"
                    placeholderTextColor="rgb(115, 115, 115)"
                    autoCapitalize="none"
                    autoCorrect={false}
                    clearButtonMode="while-editing"
                  />
                </Input>
              </Box>
              <Button
                variant="outline"
                size="md"
                onPress={handleRefreshModels}
                className="aspect-square rounded-lg border-[0.5px] border-background-100 bg-background-50 p-0"
              >
                {isRefreshing ? (
                  <Spinner size="small" className="text-background-400" />
                ) : (
                  <Icon
                    as={RefreshCw}
                    size="sm"
                    className="text-background-400"
                  />
                )}
              </Button>
            </HStack>
          </Box>

          <BottomSheetFlatList
            data={filteredModels}
            keyExtractor={(item) => item.key}
            numColumns={2}
            ListEmptyComponent={ListEmptyComponent}
            columnWrapperStyle={{
              gap: 8,
              paddingHorizontal: 16,
            }}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => handleModelSelect(item.value)}
                className="active:opacity-80"
                style={{ width: itemWidth }}
              >
                <ModelItem
                  model={item.model}
                  serverName={item.serverName}
                  isSelected={
                    selectedLoraIndex === -1
                      ? params.model === item.value
                      : params.loras?.[selectedLoraIndex]?.name === item.value
                  }
                />
              </Pressable>
            )}
            contentContainerStyle={{
              flexGrow: 1,
              paddingBottom: 34,
              gap: 16,
            }}
          />
        </View>
      </BottomSheetModal>
    </VStack>
  );
}
