import { BottomActionPanel } from '@/components/self-ui/bottom-action-panel';
import { Button } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { Check, CheckSquare, Download, MinusSquare, PlusSquare, Share, Trash2 } from 'lucide-react-native';
import { MotiView } from 'moti';
import React from 'react';

interface SelectButtonProps {
  isSelectionMode: boolean;
  onPress: () => void;
}

export const SelectButton = React.memo(({ isSelectionMode, onPress }: SelectButtonProps) => (
  <Button
    variant="outline"
    size="sm"
    onPress={onPress}
    className="h-8 w-[88px] items-center justify-center overflow-hidden rounded-lg border-outline-50 bg-background-0"
  >
    <MotiView
      animate={{
        translateY: isSelectionMode ? 0 : -20,
        opacity: isSelectionMode ? 1 : 0,
      }}
      transition={{
        type: 'timing',
        duration: 150,
        delay: isSelectionMode ? 0 : 50,
      }}
      className="absolute"
    >
      <HStack space="xs" className="items-center">
        <Icon as={Check} size="sm" className="text-primary-500" />
        <Text className="text-sm font-medium text-primary-500">Done</Text>
      </HStack>
    </MotiView>
    <MotiView
      animate={{
        translateY: isSelectionMode ? 20 : 0,
        opacity: isSelectionMode ? 0 : 1,
      }}
      transition={{
        type: 'timing',
        duration: 150,
        delay: isSelectionMode ? 50 : 0,
      }}
      className="absolute"
    >
      <HStack space="xs" className="items-center">
        <Icon as={CheckSquare} size="sm" className="text-primary-500" />
        <Text className="text-sm font-medium text-primary-500">Select</Text>
      </HStack>
    </MotiView>
  </Button>
));

interface BottomPanelProps {
  isSelectionMode: boolean;
  selectedImages: string[];
  images: Array<{ url: string; timestamp: number }>;
  onSelectAll: () => void;
  onDelete: () => void;
  onShare: () => void;
  onSave: () => void;
}

export const BottomPanel = React.memo(
  ({ isSelectionMode, selectedImages, images, onSelectAll, onDelete, onShare, onSave }: BottomPanelProps) => (
    <BottomActionPanel isOpen={isSelectionMode}>
      <VStack space="sm">
        <Text className="text-sm text-background-400">{selectedImages.length} selected</Text>
        <Button
          variant="outline"
          size="lg"
          onPress={onSelectAll}
          className="h-12 w-full justify-start border-background-100 px-4"
        >
          <Icon
            as={selectedImages.length === images.length ? MinusSquare : PlusSquare}
            size="sm"
            className="mr-2 text-primary-500"
          />
          <Text className="text-sm text-primary-500">
            {selectedImages.length === images.length ? 'Deselect All' : 'Select All'}
          </Text>
        </Button>
        <HStack space="sm">
          <Button
            variant="outline"
            size="lg"
            onPress={onShare}
            isDisabled={selectedImages.length === 0}
            className="h-12 flex-1 justify-start border-background-100 px-4"
          >
            <Icon as={Share} size="sm" className="mr-2 text-primary-500" />
            <Text className="text-sm text-primary-500">Share</Text>
          </Button>
          <Button
            variant="outline"
            size="lg"
            onPress={onSave}
            isDisabled={selectedImages.length === 0}
            className="h-12 flex-1 justify-start border-background-100 px-4"
          >
            <Icon as={Download} size="sm" className="mr-2 text-primary-500" />
            <Text className="text-sm text-primary-500">Save</Text>
          </Button>
        </HStack>
        <Button
          variant="outline"
          size="lg"
          onPress={onDelete}
          isDisabled={selectedImages.length === 0}
          className="h-12 w-full justify-start border-background-100 px-4"
        >
          <Icon as={Trash2} size="sm" className="mr-2 text-error-500" />
          <Text className="text-sm text-error-500">Delete Selected</Text>
        </Button>
      </VStack>
    </BottomActionPanel>
  ),
);
