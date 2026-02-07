import { Drawer, DrawerHeader } from '@/components/self-ui/drawer';
import { FlatList } from '@/components/ui/flat-list';
import { Icon } from '@/components/ui/icon';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { loadHistoryMedia } from '@/services/image-storage';
import { showToast } from '@/utils/toast';
import { File } from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { History } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DeleteAlert } from './delete-alert';
import { BottomPanel, SelectButton } from './edit-controls';
import { HistoryItem, getItemLayout } from './history-item';

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  serverId: string;
  workflowId?: string;
  onSelectMedia?: (url: string) => void;
  onMediaDeleted?: () => void;
}

const ITEMS_PER_PAGE = 10;

export function HistoryDrawer({
  isOpen,
  onClose,
  serverId,
  workflowId,
  onSelectMedia,
  onMediaDeleted,
}: HistoryDrawerProps) {
  const insets = useSafeAreaInsets();
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);

  const [mediaItems, setMediaItems] = useState<{ url: string; timestamp: number }[]>([]);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | 'selection' | null>(null);

  // Memoize paginatedMedia to prevent unnecessary recalculations
  const paginatedMedia = useMemo(() => mediaItems.slice(0, page * ITEMS_PER_PAGE), [mediaItems, page]);

  // Load media only when necessary
  useEffect(() => {
    let mounted = true;

    if (isOpen && workflowId) {
      loadHistoryMedia(serverId, workflowId).then((newMedia) => {
        if (mounted) {
          setMediaItems(newMedia);
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
      setSelectedMedia([]);
      setPage(1);
      setIsLoading(false);
    }
  }, [isOpen]);

  const handleToggleSelectionMode = useCallback(() => {
    setIsSelectionMode((prev) => !prev);
    setSelectedMedia([]);
  }, []);

  const handleToggleSelect = useCallback((url: string) => {
    setSelectedMedia((prev) => (prev.includes(url) ? prev.filter((item) => item !== url) : [...prev, url]));
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedMedia((prev) => (prev.length === paginatedMedia.length ? [] : paginatedMedia.map((img) => img.url)));
  }, [paginatedMedia]);

  const confirmDelete = useCallback(async () => {
    if (!workflowId || !deleteTarget) return;

    try {
      const targets = deleteTarget === 'selection' ? selectedMedia : [deleteTarget];

      // Delete both media files and their metadata files
      for (const url of targets) {
        // Delete the media file
        try {
          new File(url).delete();
        } catch (error) {
          void error;
          continue;
        }
        // Delete the metadata file
        try {
          new File(`${url}.json`).delete();
        } catch (error) {
          void error;
          // Ignore error if metadata file doesn't exist
        }
      }

      // Refresh media
      const updatedMedia = await loadHistoryMedia(serverId, workflowId);
      setMediaItems(updatedMedia);

      if (deleteTarget === 'selection') {
        setSelectedMedia([]);
        setIsSelectionMode(false);
      }

      onMediaDeleted?.();
      setIsDeleteAlertOpen(false);
      setDeleteTarget(null);
    } catch (error) {
      console.error('Failed to delete media:', error);
      showToast.error('Delete Failed', 'Failed to delete media', insets.top + 8);
    }
  }, [deleteTarget, selectedMedia, serverId, workflowId, onMediaDeleted, insets.top]);

  const handleDelete = useCallback(() => {
    if (selectedMedia.length > 0) {
      setDeleteTarget('selection');
      setIsDeleteAlertOpen(true);
    }
  }, [selectedMedia]);

  const handleShareSelected = useCallback(async () => {
    if (selectedMedia.length === 0) return;

    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        showToast.error('Sharing not available', 'Sharing is not supported on this device', insets.top + 8);
        return;
      }

      if (selectedMedia.length > 1) {
        showToast.info('Sharing first item', 'Sharing multiple items is not supported', insets.top + 8);
      }

      const url = selectedMedia[0];
      await Sharing.shareAsync(url);
    } catch (error) {
      console.error('Failed to share media:', error);
    }
  }, [insets.top, selectedMedia]);

  const handleSaveSelected = useCallback(async () => {
    if (selectedMedia.length === 0) return;

    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== 'granted') {
      showToast.error('Permission required', 'Please allow access to save media', insets.top + 8);
      return;
    }

    let savedCount = 0;
    try {
      await Promise.all(
        selectedMedia.map(async (url) => {
          await MediaLibrary.saveToLibraryAsync(url);
          savedCount++;
        })
      );
      showToast.success('Saved', `Saved ${savedCount} items to gallery`, insets.top + 8);
      setIsSelectionMode(false);
      setSelectedMedia([]);
    } catch (error) {
      console.error('Failed to save media:', error);
      showToast.error('Save Failed', 'Failed to save some media', insets.top + 8);
    }
  }, [insets.top, selectedMedia]);

  const handleDeleteItem = useCallback((url: string) => {
    setDeleteTarget(url);
    setIsDeleteAlertOpen(true);
  }, []);

  const renderItem = useCallback(
    ({ item, index }: { item: { url: string; timestamp: number }; index: number }) => (
      <HistoryItem
        url={item.url}
        index={index}
        isSelectionMode={isSelectionMode}
        isSelected={selectedMedia.includes(item.url)}
        onPress={() => (isSelectionMode ? handleToggleSelect(item.url) : onSelectMedia?.(item.url))}
        onDelete={() => handleDeleteItem(item.url)}
      />
    ),
    [isSelectionMode, selectedMedia, onSelectMedia, handleToggleSelect, handleDeleteItem],
  );

  const handleLoadMore = useCallback(() => {
    if (paginatedMedia.length >= mediaItems.length || isLoading) return;

    setIsLoading(true);
    const timer = setTimeout(() => {
      setPage((prev) => prev + 1);
      setIsLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [paginatedMedia.length, mediaItems.length, isLoading]);

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
      data: paginatedMedia,
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
    [paginatedMedia, renderItem, handleLoadMore, renderFooter],
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
          selectedMedia={selectedMedia}
          mediaItems={mediaItems}
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
        title={deleteTarget === 'selection' ? 'Delete Selected Media' : 'Delete Media'}
        description={
          deleteTarget === 'selection'
            ? `Are you sure you want to delete ${selectedMedia.length} items? This action cannot be undone.`
            : 'Are you sure you want to delete this item? This action cannot be undone.'
        }
      />
    </Drawer >
  );
}
