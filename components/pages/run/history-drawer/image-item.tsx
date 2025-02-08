import { Box } from '@/components/ui/box';
import { Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { Image } from 'expo-image';
import { Check } from 'lucide-react-native';
import { MotiView } from 'moti';
import React from 'react';

interface ImageItemProps {
  url: string;
  index: number;
  isEditMode: boolean;
  isSelected: boolean;
  onPress: () => void;
}

export const ImageItem = React.memo(
  function ImageItem({ url, index, isEditMode, isSelected, onPress }: ImageItemProps) {
    return (
      <Pressable onPress={onPress} className="relative mb-4">
        <Box className="aspect-square overflow-hidden rounded-xl border-outline-50">
          <Image
            source={url}
            alt={`Generated image ${index + 1}`}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
            cachePolicy="memory-disk"
            recyclingKey={url}
            placeholder={null}
            transition={200}
            priority={index < 4 ? 'high' : 'normal'}
          />
        </Box>
        {isEditMode && (
          <MotiView
            from={{
              opacity: 0,
              scale: 0.8,
            }}
            animate={{
              opacity: isSelected ? 1 : 0,
              scale: isSelected ? 1 : 0.8,
            }}
            transition={{
              type: 'spring',
              damping: 20,
              stiffness: 300,
            }}
            className="absolute right-2 top-2 rounded-full bg-primary-500 p-1.5 shadow-sm"
          >
            <Icon as={Check} size="sm" className="text-background-0" />
          </MotiView>
        )}
      </Pressable>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.url === nextProps.url &&
      prevProps.isEditMode === nextProps.isEditMode &&
      prevProps.isSelected === nextProps.isSelected
    );
  },
);

export const getItemLayout = (_: any, index: number) => ({
  length: 300, // Approximate height of each item
  offset: 300 * index,
  index,
});
