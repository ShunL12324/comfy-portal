import React, { useCallback, useRef } from 'react';
import { Image, View } from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { SearchableBottomSheet } from '../bottom-sheet';
import { SelectorOption } from '../types';
import { createModelOptions } from './constants';
import { Server } from '@/types/server';
import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { ImageIcon, ChevronDown, Check } from 'lucide-react-native';
import { Pressable } from '@/components/ui/pressable';

interface ModelSelectorProps {
  value: string;
  onChange: (value: string) => void;
  servers: Server[];
  onRefresh?: () => Promise<void>;
  isRefreshing?: boolean;
  type?: string;
}

export function ModelSelector({
  value,
  onChange,
  servers,
  onRefresh,
  isRefreshing,
  type = 'checkpoints',
}: ModelSelectorProps) {
  const [isVisible, setIsVisible] = React.useState(false);
  const bottomSheetRef = useRef<BottomSheetModal>(null);

  const handlePress = useCallback(() => {
    setIsVisible(true);
    bottomSheetRef.current?.present();
  }, []);

  const handleClose = useCallback(() => {
    setIsVisible(false);
    bottomSheetRef.current?.dismiss();
  }, []);

  const options = createModelOptions(servers, type);
  const selectedOption = options.find((option) => option.value === value);

  const renderTrigger = useCallback(
    (option: SelectorOption | undefined) => (
      <Pressable onPress={handlePress} className="active:opacity-80">
        <Box className="overflow-hidden rounded-xl bg-background-50">
          <HStack space="sm" className="items-center justify-between p-3">
            <HStack space="sm" className="flex-1 items-center">
              <Box className="h-10 w-10 overflow-hidden rounded-lg border-[0.5px] border-background-100">
                {option?.image ? (
                  <Image
                    source={{ uri: option.image }}
                    alt={option.label}
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
                  {option?.label || 'Select model'}
                </Text>
                <Text className="text-xs text-background-400">
                  {option?.serverName || 'Choose a model'}
                </Text>
              </VStack>
            </HStack>
            <Icon as={ChevronDown} size="sm" className="text-background-400" />
          </HStack>
        </Box>
      </Pressable>
    ),
    [handlePress],
  );

  const renderItem = useCallback(
    (item: SelectorOption, isSelected: boolean) => {
      return (
        <Pressable
          onPress={() => {
            onChange(item.value);
            handleClose();
          }}
          className="active:opacity-80"
          style={{ width: '48.5%' }}
        >
          <Box
            className={`relative overflow-hidden rounded-xl ${
              isSelected
                ? 'border-[3.5px] border-primary-500 bg-primary-500/5'
                : 'bg-background-50'
            }`}
          >
            {isSelected && (
              <Box className="absolute right-2 top-2 z-10 rounded-full bg-primary-500 p-1">
                <Icon as={Check} size="sm" className="text-background-0" />
              </Box>
            )}
            <Box className="aspect-square w-full overflow-hidden border-b-[0.5px] border-background-100">
              {item.image ? (
                <Image
                  source={{ uri: item.image }}
                  alt={item.label}
                  className="h-full w-full"
                  resizeMode="cover"
                />
              ) : (
                <Box className="h-full w-full items-center justify-center bg-background-50">
                  <Icon as={ImageIcon} size="sm" className="text-primary-300" />
                </Box>
              )}
            </Box>
            <VStack space="xs" className="p-3">
              <Text
                className={`text-sm ${
                  isSelected
                    ? 'font-medium text-primary-500'
                    : 'text-primary-900'
                }`}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {item.label}
              </Text>
              <Text className="text-xs text-background-400">
                {item.serverName}
              </Text>
            </VStack>
          </Box>
        </Pressable>
      );
    },
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
      isRefreshing={isRefreshing}
      renderTrigger={renderTrigger}
      renderItem={renderItem}
      numColumns={2}
    />
  );
}
