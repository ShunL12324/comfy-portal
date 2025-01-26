import React from 'react';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { Check } from 'lucide-react-native';
import { Icon } from '@/components/ui/icon';
import { SelectorOption } from '../types';
import { HStack } from '@/components/ui/hstack';
import { Box } from '@/components/ui/box';

interface ItemProps {
  item: SelectorOption;
  isSelected: boolean;
  onSelect: (value: string) => void;
}

export function Item({ item, isSelected, onSelect }: ItemProps) {
  return (
    <Pressable
      onPress={() => onSelect(item.value)}
      className="active:opacity-80"
    >
      <Box
        className={`mx-4 mb-2 overflow-hidden rounded-xl ${
          isSelected
            ? 'border-[0.5px] border-primary-500 bg-primary-500/5'
            : 'bg-background-50'
        }`}
      >
        <HStack space="sm" className="items-center justify-between p-3">
          <VStack space="xs" className="flex-1">
            <Text
              className={`text-base ${
                isSelected ? 'font-medium text-primary-500' : 'text-primary-900'
              }`}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {item.label}
            </Text>
            {item.description && (
              <Text className="text-xs text-background-400" numberOfLines={2}>
                {item.description}
              </Text>
            )}
          </VStack>
          {isSelected && (
            <Icon as={Check} size="sm" className="text-primary-500" />
          )}
        </HStack>
      </Box>
    </Pressable>
  );
}
