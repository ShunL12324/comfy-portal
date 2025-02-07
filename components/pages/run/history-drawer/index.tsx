import { Box } from '@/components/ui/box';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerBackdrop,
  DrawerContent,
  DrawerHeader,
} from '@/components/ui/drawer';
import { FlatList } from '@/components/ui/flat-list';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { VStack } from '@/components/ui/vstack';
import { Image } from 'expo-image';
import {
  Check,
  MinusSquare,
  PlusSquare,
  Settings2,
  Trash2,
} from 'lucide-react-native';
import { MotiView } from 'moti';
import React, { useCallback, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  images: Array<{
    url: string;
    timestamp: number;
  }>;
  onSelectImage?: (url: string) => void;
  onDeleteImages?: (urls: string[]) => void;
}

const ITEMS_PER_PAGE = 10;

interface ImageItemProps {
  url: string;
  index: number;
  isEditMode: boolean;
  isSelected: boolean;
  onPress: () => void;
}

const getItemLayout = (_: any, index: number) => ({
  length: 300, // Approximate height of each item
  offset: 300 * index,
  index,
});

const ImageItem = React.memo(
  function ImageItem({
    url,
    index,
    isEditMode,
    isSelected,
    onPress,
  }: ImageItemProps) {
    return (
      <Pressable onPress={onPress} className="relative mb-4">
        <Box className="aspect-square overflow-hidden rounded-xl border-outline-50">
          <Image
            source={url}
            alt={`Generated image ${index + 1}`}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
            cachePolicy="memory-disk"
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

export function HistoryDrawer({
  isOpen,
  onClose,
  images,
  onSelectImage,
  onDeleteImages,
}: HistoryDrawerProps) {
  const insets = useSafeAreaInsets();
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const paginatedImages = images.slice(0, page * ITEMS_PER_PAGE);

  // Reset edit mode when drawer opens
  React.useEffect(() => {
    if (isOpen) {
      setIsEditMode(false);
      setSelectedImages([]);
      setPage(1);
    }
  }, [isOpen]);

  const handleToggleEditMode = useCallback(() => {
    setIsEditMode(!isEditMode);
    setSelectedImages([]);
  }, [isEditMode]);

  const handleToggleSelect = useCallback((url: string) => {
    setSelectedImages((prev) =>
      prev.includes(url) ? prev.filter((item) => item !== url) : [...prev, url],
    );
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedImages((prev) => {
      if (prev.length === paginatedImages.length) {
        return [];
      }
      return paginatedImages.map((img) => img.url);
    });
  }, [paginatedImages]);

  const handleDelete = useCallback(() => {
    if (selectedImages.length > 0 && onDeleteImages) {
      onDeleteImages(selectedImages);
      setSelectedImages([]);
      setIsEditMode(false);
    }
  }, [selectedImages, onDeleteImages]);

  const renderItem = useCallback(
    ({
      item,
      index,
    }: {
      item: { url: string; timestamp: number };
      index: number;
    }) => (
      <ImageItem
        url={item.url}
        index={index}
        isEditMode={isEditMode}
        isSelected={selectedImages.includes(item.url)}
        onPress={() =>
          isEditMode ? handleToggleSelect(item.url) : onSelectImage?.(item.url)
        }
      />
    ),
    [isEditMode, selectedImages, onSelectImage, handleToggleSelect],
  );

  const handleLoadMore = useCallback(() => {
    if (paginatedImages.length >= images.length) return;
    setIsLoading(true);
    setTimeout(() => {
      setPage((prev) => prev + 1);
      setIsLoading(false);
    }, 500);
  }, [paginatedImages.length, images.length]);

  const renderFooter = useCallback(() => {
    if (!isLoading) return null;
    return (
      <View className="py-4">
        <Spinner size="small" />
      </View>
    );
  }, [isLoading]);

  return (
    <Drawer isOpen={isOpen} onClose={onClose} size="lg" anchor="right">
      <DrawerBackdrop />
      <DrawerContent className="relative overflow-hidden p-0">
        <View style={{ paddingTop: insets.top }} className="flex-1">
          <DrawerHeader className="border-b-[0.5px] border-b-background-100 px-4">
            <View className="flex-row items-center py-3">
              <View className="flex-1">
                <Text className="text-xl font-medium text-background-800">
                  History
                </Text>
              </View>
              <Button
                variant="outline"
                size="sm"
                onPress={handleToggleEditMode}
                className="h-8 w-[88px] items-center justify-center overflow-hidden rounded-lg border-outline-50 bg-background-0"
              >
                <MotiView
                  animate={{
                    translateY: isEditMode ? 0 : -20,
                    opacity: isEditMode ? 1 : 0,
                  }}
                  transition={{
                    type: 'timing',
                    duration: 200,
                  }}
                  className="absolute"
                >
                  <HStack space="xs" className="items-center">
                    <Icon as={Check} size="sm" className="text-primary-500" />
                    <Text className="text-sm font-medium text-primary-500">
                      Done
                    </Text>
                  </HStack>
                </MotiView>
                <MotiView
                  animate={{
                    translateY: isEditMode ? 20 : 0,
                    opacity: isEditMode ? 0 : 1,
                  }}
                  transition={{
                    type: 'timing',
                    duration: 200,
                  }}
                  className="absolute"
                >
                  <HStack space="xs" className="items-center">
                    <Icon
                      as={Settings2}
                      size="sm"
                      className="text-primary-500"
                    />
                    <Text className="text-sm font-medium text-primary-500">
                      Edit
                    </Text>
                  </HStack>
                </MotiView>
              </Button>
            </View>
          </DrawerHeader>
          <FlatList
            data={paginatedImages}
            renderItem={renderItem}
            keyExtractor={(item) => item.url}
            getItemLayout={getItemLayout}
            removeClippedSubviews={true}
            maxToRenderPerBatch={5}
            windowSize={5}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
            ListFooterComponent={renderFooter}
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingVertical: 16,
              paddingBottom: 80,
            }}
          />
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
            <View
              style={{ paddingBottom: insets.bottom }}
              className="px-4 py-4"
            >
              <VStack space="sm">
                <Text className="text-sm text-background-400">
                  {selectedImages.length} selected
                </Text>
                <Button
                  variant="outline"
                  size="lg"
                  onPress={handleSelectAll}
                  className="h-12 w-full justify-start border-background-100 px-4"
                >
                  <Icon
                    as={
                      selectedImages.length === images.length
                        ? MinusSquare
                        : PlusSquare
                    }
                    size="sm"
                    className="mr-2 text-primary-500"
                  />
                  <Text className="text-sm text-primary-500">
                    {selectedImages.length === images.length
                      ? 'Deselect All'
                      : 'Select All'}
                  </Text>
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onPress={handleDelete}
                  isDisabled={selectedImages.length === 0}
                  className="h-12 w-full justify-start border-background-100 px-4"
                >
                  <Icon as={Trash2} size="sm" className="mr-2 text-error-500" />
                  <Text className="text-sm text-error-500">
                    Delete Selected
                  </Text>
                </Button>
              </VStack>
            </View>
          </MotiView>
        </View>
      </DrawerContent>
    </Drawer>
  );
}
