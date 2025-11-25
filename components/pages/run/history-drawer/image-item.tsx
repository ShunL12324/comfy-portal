import { OverlayButton } from '@/components/self-ui/overlay-button';
import { Box } from '@/components/ui/box';
import { Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { showToast } from '@/utils/toast';
import { Image } from 'expo-image';
import * as MediaLibrary from 'expo-media-library';
import { Check, Download, Share as ShareIcon, Trash2 } from 'lucide-react-native';
import { MotiView } from 'moti';
import React from 'react';
import { Share, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ImageItemProps {
  url: string;
  index: number;
  isSelectionMode: boolean;
  isSelected: boolean;
  onPress: () => void;
  onDelete?: () => void;
}

export const ImageItem = React.memo(
  function ImageItem({ url, index, isSelectionMode, isSelected, onPress, onDelete }: ImageItemProps) {
    const insets = useSafeAreaInsets();

    const handleShare = async () => {
      try {
        await Share.share({
          url,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    };

    const handleSave = async () => {
      try {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status !== 'granted') {
          showToast.error('Permission needed', 'Please grant permission to save images.', insets.top + 8);
          return;
        }
        await MediaLibrary.saveToLibraryAsync(url);
        showToast.success('Saved', 'Image saved to gallery.', insets.top + 8);
      } catch (error) {
        console.error('Error saving:', error);
        showToast.error('Error', 'Failed to save image.', insets.top + 8);
      }
    };

    const handleDelete = () => {
      onDelete?.();
    };

    return (
      <Pressable onPress={onPress} className="relative mb-4">
        <Box className="aspect-square overflow-hidden rounded-md border-outline-50">
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
        {isSelectionMode ? (
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
            className="absolute right-2 bottom-2 rounded-full bg-accent-500 p-1.5 shadow-sm"
          >
            <Icon as={Check} size="sm" className="text-white" />
          </MotiView>
        ) : (
          <View className="absolute right-2 top-2 flex-row gap-2">
            <OverlayButton icon={ShareIcon} onPress={handleShare} />
            <OverlayButton icon={Download} onPress={handleSave} />
            {onDelete && <OverlayButton icon={Trash2} onPress={handleDelete} iconColor="#ef4444" />}
          </View>
        )}
      </Pressable>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.url === nextProps.url &&
      prevProps.isSelectionMode === nextProps.isSelectionMode &&
      prevProps.isSelected === nextProps.isSelected
    );
  },
);

export const getItemLayout = (_: any, index: number) => ({
  length: 300, // Approximate height of each item
  offset: 300 * index,
  index,
});
