import { NumberSlider } from '@/components/self-ui/slider';
import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { useServersStore } from '@/features/server/stores/server-store';
import { scanServerModelsByFolder } from '@/features/server/utils/server-sync';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { Image } from 'expo-image';
import { Check, ChevronDown, ImageIcon, Sliders, Trash2 } from 'lucide-react-native';
import React, { useCallback, useRef } from 'react';
import { TouchableOpacity } from 'react-native';
import { SearchableBottomSheet } from '../bottom-sheet';
import { SelectorOption } from '../types';
import { createModelOptions } from './constants';

interface ModelSelectorProps {
  value: string;
  onChange: (value: string) => void;
  onRefresh?: () => Promise<void>;
  onDelete?: () => void;
  isRefreshing?: boolean;
  type?: 'checkpoints' | 'loras' | 'embeddings' | 'diffusion_models' | 'vae' | 'text_encoders';
  serverId: string;
  onLoraClipStrengthChange?: (value: number) => void;
  onLoraModelStrengthChange?: (value: number) => void;
  initialClipStrength?: number;
  initialModelStrength?: number;
}

interface StrengthControlProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  onChangeEnd?: (value: number) => void;
}

function StrengthControl({ label, value, onChange, onChangeEnd }: StrengthControlProps) {
  return (
    <>
      <HStack space="xs" className="mt-2 items-center justify-between">
        <HStack space="xs" className="items-center">
          <Icon as={Sliders} size="xs" className="text-typography-900" />
          <Text className="text-xs text-typography-900">{label}</Text>
        </HStack>
      </HStack>
      <HStack space="sm" className="mt-2 w-full items-center">
        <NumberSlider
          defaultValue={value}
          minValue={0}
          maxValue={2}
          step={0.05}
          onChange={onChange}
          onChangeEnd={onChangeEnd}
          decimalPlaces={2}
          space={12}
        />
      </HStack>
    </>
  );
}

function ModelPreview({ image, label }: { image?: string; label: string }) {
  if (!image) {
    return (
      <Box className="h-full w-full items-center justify-center bg-background-200">
        <Icon as={ImageIcon} size="sm" className="text-typography-400" />
      </Box>
    );
  }

  return <Image source={{ uri: image }} alt={label} style={{ height: '100%', width: '100%' }} contentFit="cover" />;
}

export function ModelSelector({
  value,
  onChange,
  onRefresh: customOnRefresh,
  isRefreshing: customIsRefreshing,
  onDelete,
  type = 'checkpoints',
  serverId,
  onLoraClipStrengthChange,
  onLoraModelStrengthChange,
  initialClipStrength = 1,
  initialModelStrength = 1,
}: ModelSelectorProps) {
  const [isVisible, setIsVisible] = React.useState(false);
  const [localClipStrength, setLocalClipStrength] = React.useState(initialClipStrength);
  const [localModelStrength, setLocalModelStrength] = React.useState(initialModelStrength);
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const server = useServersStore((state) => state.servers.find((s) => s.id === serverId));
  const updateServerStatus = useServersStore((state) => state.updateServerStatus);
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  // Default refresh function that uses scanServerModelsByFolder
  const defaultOnRefresh = async () => {
    if (!server) return;
    setIsRefreshing(true);
    try {
      const models = await scanServerModelsByFolder(server, type);
      if (models.length > 0) {
        const existingModels = server.models || [];
        // Create a Map to store unique models, using name+type as key
        const modelMap = new Map();

        // Add existing models of different types
        existingModels
          .filter((model) => model.type !== type)
          .forEach((model) => modelMap.set(`${model.type}_${model.name}`, model));

        // Add new models, will automatically override any duplicates
        models.forEach((model) => modelMap.set(`${model.type}_${model.name}`, model));

        const updatedModels = Array.from(modelMap.values());
        updateServerStatus(serverId, server.status, server.latency, updatedModels);
      }
    } catch (error) {
      console.error('Failed to refresh models:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const onRefresh = customOnRefresh || defaultOnRefresh;
  const finalIsRefreshing = customIsRefreshing ?? isRefreshing;

  // Update local strength values when initialStrength changes
  React.useEffect(() => {
    setLocalClipStrength(initialClipStrength);
    setLocalModelStrength(initialModelStrength);
  }, [initialClipStrength, initialModelStrength]);

  const handlePress = useCallback(() => {
    setIsVisible(true);
    bottomSheetRef.current?.present();
  }, []);

  const handleClose = useCallback(() => {
    setIsVisible(false);
    bottomSheetRef.current?.dismiss();
  }, []);

  const options = createModelOptions(serverId, type);

  const renderTrigger = useCallback(
    (option: SelectorOption | undefined) => (
      <Box className={`overflow-hidden rounded-xl bg-background-50`}>
        <Pressable onPress={handlePress}>
          <HStack space="sm" className="items-center justify-between p-3">
            <HStack space="sm" className="flex-1 items-center">
              <Box className="h-10 w-10 overflow-hidden rounded-lg border-[0.5px] border-background-100">
                <ModelPreview image={option?.image} label={option?.label || ''} />
              </Box>
              <VStack space="xs" className="flex-1">
                <Text className="text-sm font-medium text-typography-950" numberOfLines={1} ellipsizeMode="tail">
                  {option?.label || 'Select model'}
                </Text>
                <Text className="text-xs text-typography-400">{option?.serverName || 'Choose a model'}</Text>
              </VStack>
            </HStack>
            <Icon as={ChevronDown} size="sm" className="text-typography-400" />
          </HStack>
        </Pressable>
        {type === 'loras' && (
          <VStack className="px-4 pb-3">
            {onLoraModelStrengthChange && (
              <StrengthControl
                label="Model Strength"
                value={localModelStrength}
                onChange={setLocalModelStrength}
                onChangeEnd={onLoraModelStrengthChange}
              />
            )}
            {onLoraClipStrengthChange && (
              <StrengthControl
                label="Clip Strength"
                value={localClipStrength}
                onChange={setLocalClipStrength}
                onChangeEnd={onLoraClipStrengthChange}
              />
            )}
            {onDelete && (
              <TouchableOpacity
                className="mt-4 flex-row items-center justify-center gap-2 rounded-lg border-[0.5px] border-error-300 bg-background-50 p-3"
                onPress={onDelete}
              >
                <Icon as={Trash2} size="xs" className="text-error-300" />
                <Text className="text-xs text-error-300">Remove LoRA</Text>
              </TouchableOpacity>
            )}
          </VStack>
        )}
      </Box>
    ),
    [handlePress, type, localClipStrength, localModelStrength, onDelete],
  );

  const renderItem = useCallback(
    (item: SelectorOption, isSelected: boolean) => (
      <Pressable
        onPress={() => {
          onChange(item.value);
          handleClose();
        }}
        className="active:opacity-80"
        style={{ width: '48.5%' }}
      >
        <Box
          className={`relative overflow-hidden rounded-xl ${isSelected ? 'border-[3px] border-outline-400' : 'bg-background-50'
            }`}
        >
          {isSelected && (
            <Box className="absolute right-2 top-2 z-10 rounded-full bg-background-50 p-1">
              <Icon as={Check} size="sm" className="text-typography-950" />
            </Box>
          )}
          <Box className="aspect-square w-full overflow-hidden border-b-[0.5px] border-background-100">
            <ModelPreview image={item.image} label={item.label} />
          </Box>
          <VStack space="xs" className="p-3">
            <Text
              className={`text-sm ${isSelected ? 'font-medium text-primary-500' : 'text-primary-900'}`}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {item.label}
            </Text>
            <Text className="text-xs text-background-400">{item.serverName}</Text>
          </VStack>
        </Box>
      </Pressable>
    ),
    [onChange, handleClose],
  );

  return (
    <SearchableBottomSheet
      ref={bottomSheetRef}
      isVisible={isVisible}
      onClose={handleClose}
      onSelect={onChange}
      title={`Select ${type}`}
      options={options}
      value={value}
      searchPlaceholder={`Search ${type}...`}
      showRefreshButton={!!onRefresh}
      onRefresh={onRefresh}
      isRefreshing={finalIsRefreshing}
      renderTrigger={renderTrigger}
      renderItem={renderItem}
      numColumns={2}
    />
  );
}
