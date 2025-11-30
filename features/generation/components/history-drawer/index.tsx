import { Drawer, DrawerHeader } from '@/components/self-ui/drawer';
import { FlatList } from '@/components/ui/flat-list';
import { Icon } from '@/components/ui/icon';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { loadHistoryImages } from '@/services/image-storage';
import { showToast } from '@/utils/toast';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { History } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DeleteAlert } from './delete-alert';
import { BottomPanel, SelectButton } from './edit-controls';
import { ImageItem, getItemLayout } from './image-item';

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  serverId: string;
  workflowId?: string;
  onSelectImage?: (url: string) => void;
  onImageDeleted?: () => void;
}

const ITEMS_PER_PAGE = 10;

export function HistoryDrawer({
  isOpen,
  onClose,
  serverId,
  workflowId,
  onSelectImage,
  onImageDeleted,
}: HistoryDrawerProps) {
  const insets = useSafeAreaInsets();
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);

  const [images, setImages] = useState<Array<{ url: string; timestamp: number }>>([]);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | 'selection' | null>(null);

  // Memoize paginatedImages to prevent unnecessary recalculations
  const paginatedImages = useMemo(() => images.slice(0, page * ITEMS_PER_PAGE), [images, page]);

  // Load images only when necessary
  useEffect(() => {
    let mounted = true;

    if (isOpen && workflowId) {
      loadHistoryImages(serverId, workflowId).then((newImages) => {
        if (mounted) {
          setImages(newImages);
        }
      });
    }

    return () => {
      mounted = false;
    };
  }, [isOpen, serverId, workflowId]);

  // Reset state when drawer closes
  useEffect(() => {
    if (!isOpen) {
      setIsSelectionMode(false);
      setSelectedImages([]);
      setPage(1);
      setIsLoading(false);
    }
  }, [isOpen]);

  const handleToggleSelectionMode = useCallback(() => {
    setIsSelectionMode((prev) => !prev);
    setSelectedImages([]);
  }, []);

  const handleToggleSelect = useCallback((url: string) => {
    setSelectedImages((prev) => (prev.includes(url) ? prev.filter((item) => item !== url) : [...prev, url]));
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedImages((prev) => (prev.length === paginatedImages.length ? [] : paginatedImages.map((img) => img.url)));
  }, [paginatedImages]);

  const confirmDelete = useCallback(async () => {
    if (!workflowId || !deleteTarget) return;

    try {
      const targets = deleteTarget === 'selection' ? selectedImages : [deleteTarget];

      // Delete both image files and their metadata files
      await Promise.all(
        targets.map(async (url) => {
          // Delete the image file
          await FileSystem.deleteAsync(url);
          // Delete the metadata file
          await FileSystem.deleteAsync(`${url}.json`).catch(() => {
            // Ignore error if metadata file doesn't exist
          });
        }),
      );

      // Refresh images
      const updatedImages = await loadHistoryImages(serverId, workflowId);
      setImages(updatedImages);

      if (deleteTarget === 'selection') {
        setSelectedImages([]);
        setIsSelectionMode(false);
      }

      onImageDeleted?.();
      setIsDeleteAlertOpen(false);
      setDeleteTarget(null);
    } catch (error) {
      console.error('Failed to delete images:', error);
      showToast.error('Delete Failed', 'Failed to delete images', insets.top + 8);
    }
  }, [deleteTarget, selectedImages, serverId, workflowId, onImageDeleted, insets.top]);

  const handleDelete = useCallback(() => {
    if (selectedImages.length > 0) {
      setDeleteTarget('selection');
      setIsDeleteAlertOpen(true);
    }
  }, [selectedImages]);

  const handleShareSelected = useCallback(async () => {
    if (selectedImages.length === 0) return;

    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        showToast.error('Sharing not available', 'Sharing is not supported on this device', insets.top + 8);
        return;
      }

      if (selectedImages.length > 1) {
        showToast.info('Sharing first image', 'Sharing multiple images is not supported', insets.top + 8);
      }

      const url = selectedImages[0];
      await Sharing.shareAsync(url);
    } catch (error) {
      console.error('Failed to share image:', error);
    }
  }, [selectedImages]);

  const handleSaveSelected = useCallback(async () => {
    if (selectedImages.length === 0) return;

    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== 'granted') {
      showToast.error('Permission required', 'Please allow access to save images', insets.top + 8);
      return;
    }

    let savedCount = 0;
    try {
      await Promise.all(
        selectedImages.map(async (url) => {
          await MediaLibrary.saveToLibraryAsync(url);
          savedCount++;
        })
      );
      showToast.success('Saved', `Saved ${savedCount} images to gallery`, insets.top + 8);
      setIsSelectionMode(false);
      setSelectedImages([]);
    } catch (error) {
      console.error('Failed to save images:', error);
      showToast.error('Save Failed', 'Failed to save some images', insets.top + 8);
    }
  }, [selectedImages]);

  const handleDeleteItem = useCallback((url: string) => {
    setDeleteTarget(url);
    setIsDeleteAlertOpen(true);
  }, []);

  const renderItem = useCallback(
    ({ item, index }: { item: { url: string; timestamp: number }; index: number }) => (
      <ImageItem
        url={item.url}
        index={index}
        isSelectionMode={isSelectionMode}
        isSelected={selectedImages.includes(item.url)}
        onPress={() => (isSelectionMode ? handleToggleSelect(item.url) : onSelectImage?.(item.url))}
        onDelete={() => handleDeleteItem(item.url)}
      />
    ),
    [isSelectionMode, selectedImages, onSelectImage, handleToggleSelect],
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
    <Drawer isOpen={isOpen} onClose={onClose} size="lg" anchor="right" insets={insets}>
      <View style={{ paddingTop: insets.top }} className="flex-1">
        <DrawerHeader className="border-b-[0.5px] border-b-background-100 px-4">
          <View className="flex-row items-center py-3">
            <View className="flex-1 flex-row items-center gap-2">
              <Icon as={History} size="sm" className="text-background-800" />
              <Text className="text-base font-medium text-background-800">History</Text>
            </View>
            <SelectButton isSelectionMode={isSelectionMode} onPress={handleToggleSelectionMode} />
          </View>
        </DrawerHeader>
        <FlatList {...flatListProps} />
        <BottomPanel
          isSelectionMode={isSelectionMode}
          selectedImages={selectedImages}
          images={images}
          onSelectAll={handleSelectAll}
          onDelete={handleDelete}
          onShare={handleShareSelected}
          onSave={handleSaveSelected}
        />
      </View>


      <DeleteAlert
        isOpen={isDeleteAlertOpen}
        onClose={() => setIsDeleteAlertOpen(false)}
        onConfirm={confirmDelete}
        title={deleteTarget === 'selection' ? 'Delete Selected Images' : 'Delete Image'}
        description={
          deleteTarget === 'selection'
            ? `Are you sure you want to delete ${selectedImages.length} images? This action cannot be undone.`
            : 'Are you sure you want to delete this image? This action cannot be undone.'
        }
      />
    </Drawer >
  );
}
