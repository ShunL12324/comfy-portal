import { ThemedBottomSheetModal } from '@/components/self-ui/themed-bottom-sheet-modal';
import { Icon } from '@/components/ui/icon';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { loadHistoryMedia } from '@/services/image-storage';
import { showToast } from '@/utils/toast';
import { File } from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { History } from 'lucide-react-native';
import React, { forwardRef, useCallback, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomSheetFlatList, BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import { DeleteAlert } from './history-drawer/delete-alert';
import { BottomPanel, SelectButton } from './history-drawer/edit-controls';
import { HistoryItem, getItemLayout } from './history-drawer/history-item';

interface HistoryGallerySheetProps {
  serverId: string;
  workflowId?: string;
  onSelectMedia?: (url: string) => void;
  onMediaDeleted?: () => void;
}

const ITEMS_PER_PAGE = 10;

export const HistoryGallerySheet = forwardRef<BottomSheetModal, HistoryGallerySheetProps>(
  ({ serverId, workflowId, onSelectMedia, onMediaDeleted }, ref) => {
    const insets = useSafeAreaInsets();
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedMedia, setSelectedMedia] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [mediaItems, setMediaItems] = useState<{ url: string; timestamp: number }[]>([]);
    const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<string | 'selection' | null>(null);
    const [isPresented, setIsPresented] = useState(false);

    const paginatedMedia = useMemo(() => mediaItems.slice(0, page * ITEMS_PER_PAGE), [mediaItems, page]);

    // Load media when sheet is presented
    useEffect(() => {
      if (isPresented && workflowId) {
        loadHistoryMedia(serverId, workflowId).then(setMediaItems);
      }
    }, [isPresented, serverId, workflowId]);

    const handleSheetChange = useCallback((index: number) => {
      if (index === -1) {
        setIsPresented(false);
        setIsSelectionMode(false);
        setSelectedMedia([]);
        setPage(1);
        setIsLoading(false);
      } else if (!isPresented) {
        setIsPresented(true);
      }
    }, [isPresented]);

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
        for (const url of targets) {
          try { new File(url).delete(); } catch { /* ignore */ }
          try { new File(`${url}.json`).delete(); } catch { /* ignore */ }
        }
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
        await Sharing.shareAsync(selectedMedia[0]);
      } catch { /* ignore */ }
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
        await Promise.all(selectedMedia.map(async (url) => {
          await MediaLibrary.saveToLibraryAsync(url);
          savedCount++;
        }));
        showToast.success('Saved', `Saved ${savedCount} items to gallery`, insets.top + 8);
        setIsSelectionMode(false);
        setSelectedMedia([]);
      } catch {
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
      setTimeout(() => {
        setPage((prev) => prev + 1);
        setIsLoading(false);
      }, 500);
    }, [paginatedMedia.length, mediaItems.length, isLoading]);

    const renderFooter = useMemo(() => {
      if (!isLoading) return null;
      return (
        <View className="py-4">
          <Spinner size="small" />
        </View>
      );
    }, [isLoading]);

    const snapPoints = useMemo(() => ['90%'], []);

    return (
      <>
        <ThemedBottomSheetModal
          ref={ref}
          index={0}
          snapPoints={snapPoints}
          topInset={insets.top}
          enablePanDownToClose
          onChange={handleSheetChange}
          animateOnMount
          enableDynamicSizing={false}
        >
          {/* Header */}
          <BottomSheetView style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
            <View className="flex-row items-center py-2">
              <View className="flex-1 flex-row items-center gap-2">
                <Icon as={History} size="sm" className="text-typography-800" />
                <Text className="text-base font-medium text-typography-800">History</Text>
              </View>
              <SelectButton isSelectionMode={isSelectionMode} onPress={handleToggleSelectionMode} />
            </View>
          </BottomSheetView>

          {/* List */}
          <BottomSheetFlatList
            data={paginatedMedia}
            renderItem={renderItem}
            keyExtractor={(item: { url: string }) => item.url}
            getItemLayout={getItemLayout}
            removeClippedSubviews
            maxToRenderPerBatch={5}
            windowSize={5}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
            ListFooterComponent={renderFooter}
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingVertical: 8,
              paddingBottom: 80,
            }}
            initialNumToRender={6}
            updateCellsBatchingPeriod={100}
          />

          {/* Bottom panel */}
          <BottomPanel
            isSelectionMode={isSelectionMode}
            selectedMedia={selectedMedia}
            mediaItems={mediaItems}
            onSelectAll={handleSelectAll}
            onDelete={handleDelete}
            onShare={handleShareSelected}
            onSave={handleSaveSelected}
          />
        </ThemedBottomSheetModal>

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
      </>
    );
  },
);

HistoryGallerySheet.displayName = 'HistoryGallerySheet';
