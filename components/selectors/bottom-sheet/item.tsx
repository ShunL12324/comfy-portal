import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { Check } from 'lucide-react-native';
import React from 'react';
import { SelectorOption } from '../types';

interface ItemProps {
  item: SelectorOption;
  isSelected: boolean;
  onSelect: (value: string) => void;
}

export function Item({ item, isSelected, onSelect }: ItemProps) {
  return (
    <Pressable onPress={() => onSelect(item.value)} className="active:opacity-80">
      <Box
        className={`mx-4 mb-2 overflow-hidden rounded-xl ${
          isSelected ? 'border-0 border-outline-200 bg-primary-200' : 'bg-background-50'
        }`}
      >
        <HStack space="sm" className="items-center justify-between p-3">
          <VStack space="xs" className="flex-1">
            <Text
              className={`text-base ${isSelected ? 'font-medium text-typography-950' : 'text-typography-500'}`}
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
          {isSelected && <Icon as={Check} size="sm" className="text-typography-950" />}
        </HStack>
      </Box>
    </Pressable>
  );
}
