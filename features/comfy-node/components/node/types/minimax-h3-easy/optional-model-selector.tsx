import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { SearchableBottomSheet } from '@/components/common/selectors/bottom-sheet';
import { SelectorOption } from '@/components/common/selectors/types';
import { useModelOptions } from '@/components/common/selectors/model/use-model-options';
import { useServersStore } from '@/features/server/stores/server-store';
import { clearNodeSchemaCache } from '@/services/node-schema';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { Check, ChevronDown, ImageIcon } from 'lucide-react-native';
import { Image } from 'expo-image';
import React, { useCallback, useRef, useState } from 'react';

interface OptionalModelSelectorProps {
  value: string;
  onChange: (value: string) => void;
  type: string | string[];
  classType?: string;
  inputName?: string;
  serverId: string;
}

/**
 * FL2VA/Ref2VA transformer pickers for MiniMaxH3EasyLoader.
 *
 * Both inputs are optional, and the node declares "none"/"None"/"无" as
 * interchangeable valid values for "unset" — a workaround for how ComfyUI's
 * own web frontend localizes that sentinel and submits the localized string
 * back for validation (see ComfyUI-MiniMaxH3-Easy/nodes.py, NONE_MODEL_*).
 * None of those three are a model to browse, so unlike the generic
 * ModelSelector this picker never shows them as choices — only real,
 * installed files, or nothing at all when none are installed.
 */
const NONE_SENTINELS = new Set(['none', 'None', '无']);

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

export function OptionalModelSelector({ value, onChange, type, classType, inputName, serverId }: OptionalModelSelectorProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const server = useServersStore((state) => state.servers.find((s) => s.id === serverId));
  const syncModels = useServersStore((state) => state.syncModels);
  const folders = Array.isArray(type) ? type : [type];

  // The node-schema cache never expires on its own — this is what a model
  // that was just downloaded (or, here, symlinked into place server-side)
  // needs pressed before it shows up.
  const onRefresh = async () => {
    if (!server) return;
    setIsRefreshing(true);
    try {
      clearNodeSchemaCache(serverId);
      await syncModels(serverId, { folders, refreshPreviews: true });
    } finally {
      setIsRefreshing(false);
    }
  };

  const { options: allOptions, fromServer } = useModelOptions({ serverId, classType, inputName, folders });
  const options = allOptions.filter((option) => !NONE_SENTINELS.has(option.value));

  // The server's node definition is exhaustive, so a value that's neither a
  // real option nor a none-sentinel genuinely isn't installed — flagged
  // rather than cleared, since silently dropping it would erase what the
  // workflow actually asked for.
  const isMissing = fromServer && !!value && !NONE_SENTINELS.has(value) && !options.some((o) => o.value === value);
  const currentOption = options.find((o) => o.value === value);
  const missingLabel = isMissing ? value.replace(/\.[^/.]+$/, '') : undefined;

  const handlePress = useCallback(() => {
    setIsVisible(true);
    bottomSheetRef.current?.present();
  }, []);
  const handleClose = useCallback(() => setIsVisible(false), []);

  const renderTrigger = useCallback(
    () => (
      <Pressable onPress={handlePress}>
        <Box
          className={`overflow-hidden rounded-xl ${isMissing ? 'border-[0.5px] border-error-300 bg-error-50' : 'bg-background-50'}`}
        >
          <HStack space="sm" className="items-center justify-between p-3">
            <HStack space="sm" className="flex-1 items-center">
              <Box className="h-10 w-10 overflow-hidden rounded-lg border-[0.5px] border-background-100">
                <ModelPreview image={currentOption?.image} label={currentOption?.label || ''} />
              </Box>
              <VStack space="xs" className="flex-1">
                <Text
                  className={`text-sm font-medium ${isMissing ? 'text-error-600' : 'text-typography-950'}`}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {missingLabel || currentOption?.label || 'None'}
                </Text>
                <Text className={`text-xs ${isMissing ? 'text-error-500' : 'text-typography-400'}`}>
                  {isMissing ? 'Not installed on server' : currentOption?.description || 'Choose a model'}
                </Text>
              </VStack>
            </HStack>
            <Icon as={ChevronDown} size="sm" className="text-typography-400" />
          </HStack>
        </Box>
      </Pressable>
    ),
    [handlePress, isMissing, currentOption, missingLabel],
  );

  const renderItem = useCallback(
    (item: SelectorOption, isSelected: boolean) => (
      <Pressable
        onPress={() => {
          onChange(item.value);
          handleClose();
        }}
        className="w-[48.5%] active:opacity-80"
      >
        <Box
          className={`relative overflow-hidden rounded-xl ${isSelected ? 'border-[3px] border-outline-400' : 'bg-background-200'}`}
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
            {item.description ? <Text className="text-xs text-background-400">{item.description}</Text> : null}
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
      showRefreshButton
      onRefresh={onRefresh}
      isRefreshing={isRefreshing}
      renderTrigger={renderTrigger}
      renderItem={renderItem}
      numColumns={2}
      emptyComponent={
        <VStack className="items-center py-12">
          <Text className="text-sm text-typography-400">No models installed for this input</Text>
        </VStack>
      }
    />
  );
}
