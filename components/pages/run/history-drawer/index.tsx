import { Drawer, DrawerBackdrop, DrawerContent, DrawerHeader } from '@/components/ui/drawer';
import { FlatList } from '@/components/ui/flat-list';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { loadHistoryImages } from '@/utils/image-storage';
import * as FileSystem from 'expo-file-system';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomPanel, EditButton } from './edit-controls';
import { ImageItem, getItemLayout } from './image-item';

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  serverId: string;
  presetId?: string;
  onSelectImage?: (url: string) => void;
  onImageDeleted?: () => void;
}

const ITEMS_PER_PAGE = 10;

export function HistoryDrawer({
  isOpen,
  onClose,
  serverId,
  presetId,
  onSelectImage,
  onImageDeleted,
}: HistoryDrawerProps) {
  const insets = useSafeAreaInsets();
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [images, setImages] = useState<Array<{ url: string; timestamp: number }>>([]);

  // Memoize paginatedImages to prevent unnecessary recalculations
  const paginatedImages = useMemo(() => images.slice(0, page * ITEMS_PER_PAGE), [images, page]);

  // Load images only when necessary
  useEffect(() => {
    let mounted = true;

    if (isOpen && presetId) {
      loadHistoryImages(serverId, presetId).then((newImages) => {
        if (mounted) {
          setImages(newImages);
        }
      });
    }

    return () => {
      mounted = false;
    };
  }, [isOpen, serverId, presetId]);

  // Reset state when drawer closes
  useEffect(() => {
    if (!isOpen) {
      setIsEditMode(false);
      setSelectedImages([]);
      setPage(1);
      setIsLoading(false);
    }
  }, [isOpen]);

  const handleToggleEditMode = useCallback(() => {
    setIsEditMode((prev) => !prev);
    setSelectedImages([]);
  }, []);

  const handleToggleSelect = useCallback((url: string) => {
    setSelectedImages((prev) => (prev.includes(url) ? prev.filter((item) => item !== url) : [...prev, url]));
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedImages((prev) => (prev.length === paginatedImages.length ? [] : paginatedImages.map((img) => img.url)));
  }, [paginatedImages]);

  const handleDelete = useCallback(async () => {
    if (selectedImages.length > 0 && presetId) {
      try {
        // Delete both image files and their metadata files
        await Promise.all(
          selectedImages.map(async (url) => {
            // Delete the image file
            await FileSystem.deleteAsync(url);
            // Delete the metadata file
            await FileSystem.deleteAsync(`${url}.json`).catch(() => {
              // Ignore error if metadata file doesn't exist
            });
          }),
        );

        // Refresh images
        const updatedImages = await loadHistoryImages(serverId, presetId);
        setImages(updatedImages);

        setSelectedImages([]);
        setIsEditMode(false);
        onImageDeleted?.();
      } catch (error) {
        console.error('Failed to delete images:', error);
      }
    }
  }, [selectedImages, serverId, presetId, onImageDeleted]);

  const renderItem = useCallback(
    ({ item, index }: { item: { url: string; timestamp: number }; index: number }) => (
      <ImageItem
        url={item.url}
        index={index}
        isEditMode={isEditMode}
        isSelected={selectedImages.includes(item.url)}
        onPress={() => (isEditMode ? handleToggleSelect(item.url) : onSelectImage?.(item.url))}
      />
    ),
    [isEditMode, selectedImages, onSelectImage, handleToggleSelect],
  );

  const handleLoadMore = useCallback(() => {
    if (paginatedImages.length >= images.length || isLoading) return;

    setIsLoading(true);
    const timer = setTimeout(() => {
      setPage((prev) => prev + 1);
      setIsLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [paginatedImages.length, images.length, isLoading]);

  const renderFooter = useMemo(() => {
    if (!isLoading) return null;
    return (
      <View className="py-4">
        <Spinner size="small" />
      </View>
    );
  }, [isLoading]);

  const flatListProps = useMemo(
    () => ({
      data: paginatedImages,
      renderItem,
      keyExtractor: (item: { url: string }) => item.url,
      getItemLayout,
      removeClippedSubviews: true,
      maxToRenderPerBatch: 5,
      windowSize: 5,
      onEndReached: handleLoadMore,
      onEndReachedThreshold: 0.5,
      ListFooterComponent: renderFooter,
      contentContainerStyle: {
        paddingHorizontal: 16,
        paddingVertical: 16,
        paddingBottom: 80,
      },
      initialNumToRender: 6,
      updateCellsBatchingPeriod: 100,
    }),
    [paginatedImages, renderItem, handleLoadMore, renderFooter],
  );

  return (
    <Drawer isOpen={isOpen} onClose={onClose} size="lg" anchor="right">
      <DrawerBackdrop />
      <DrawerContent className="relative overflow-hidden p-0">
        <View style={{ paddingTop: insets.top }} className="flex-1">
          <DrawerHeader className="border-b-[0.5px] border-b-background-100 px-4">
            <View className="flex-row items-center py-3">
              <View className="flex-1">
                <Text className="text-xl font-medium text-background-800">History</Text>
              </View>
              <EditButton isEditMode={isEditMode} onPress={handleToggleEditMode} />
            </View>
          </DrawerHeader>
          <FlatList {...flatListProps} />
          <BottomPanel
            isEditMode={isEditMode}
            selectedImages={selectedImages}
            images={images}
            onSelectAll={handleSelectAll}
            onDelete={handleDelete}
            insets={insets}
          />
        </View>
      </DrawerContent>
    </Drawer>
  );
}
