import { Button } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { VStack } from '@/components/ui/vstack';
import { Check, MinusSquare, PlusSquare, Settings2, Trash2 } from 'lucide-react-native';
import { MotiView } from 'moti';
import React from 'react';

interface EditButtonProps {
  isEditMode: boolean;
  onPress: () => void;
}

export const EditButton = React.memo(({ isEditMode, onPress }: EditButtonProps) => (
  <Button
    variant="outline"
    size="sm"
    onPress={onPress}
    className="h-8 w-[88px] items-center justify-center overflow-hidden rounded-lg border-outline-50 bg-background-0"
  >
    <MotiView
      animate={{
        translateY: isEditMode ? 0 : -20,
        opacity: isEditMode ? 1 : 0,
      }}
      transition={{
        type: 'timing',
        duration: 150,
        delay: isEditMode ? 0 : 50,
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
        translateY: isEditMode ? 20 : 0,
        opacity: isEditMode ? 0 : 1,
      }}
      transition={{
        type: 'timing',
        duration: 150,
        delay: isEditMode ? 50 : 0,
      }}
      className="absolute"
    >
      <HStack space="xs" className="items-center">
        <Icon as={Settings2} size="sm" className="text-primary-500" />
        <Text className="text-sm font-medium text-primary-500">Edit</Text>
      </HStack>
    </MotiView>
  </Button>
));

interface BottomPanelProps {
  isEditMode: boolean;
  selectedImages: string[];
  images: Array<{ url: string; timestamp: number }>;
  onSelectAll: () => void;
  onDelete: () => void;
  insets: { bottom: number };
}

export const BottomPanel = React.memo(
  ({ isEditMode, selectedImages, images, onSelectAll, onDelete, insets }: BottomPanelProps) => (
    <MotiView
      animate={{
        translateY: isEditMode ? 0 : 200,
        opacity: isEditMode ? 1 : 0,
      }}
      transition={{
        type: 'timing',
        duration: 200,
      }}
      className="absolute bottom-0 left-0 right-0 border-t-[0.5px] border-t-background-100 bg-background-0"
    >
      <View style={{ paddingBottom: insets.bottom }} className="px-4 py-4">
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
      </View>
    </MotiView>
  ),
);
