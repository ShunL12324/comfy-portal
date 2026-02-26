import { ThemedBottomSheetModal } from '@/components/self-ui/themed-bottom-sheet-modal';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { loadHistoryMedia } from '@/services/image-storage';
import { showToast } from '@/utils/toast';
import { File } from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { Download, History, Share, Trash2 } from 'lucide-react-native';
import React, { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomSheetFlatList, BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import { DeleteAlert } from './history-drawer/delete-alert';
import { HistoryItem } from './history-drawer/history-item';

interface HistoryGallerySheetProps {
  serverId: string;
  workflowId?: string;
  onSelectMedia?: (url: string) => void;
}

export interface HistoryGallerySheetRef {
  present: () => void;
  dismiss: () => void;
}

const NUM_COLUMNS = 3;
const GRID_GAP = 4;
const HORIZONTAL_PADDING = 16;

export const HistoryGallerySheet = forwardRef<HistoryGallerySheetRef, HistoryGallerySheetProps>(
  ({ serverId, workflowId, onSelectMedia }, ref) => {
    const insets = useSafeAreaInsets();
    const sheetRef = useRef<BottomSheetModal>(null);
    const needsLoadRef = useRef(false);
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedMedia, setSelectedMedia] = useState<Set<string>>(new Set());
    const [mediaItems, setMediaItems] = useState<{ url: string; timestamp: number }[]>([]);
    const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);

    // Stable callbacks that HistoryItem can reference via url prop
    const onItemPressRef = useRef<(url: string) => void>(() => {});
    const onItemLongPressRef = useRef<(url: string) => void>(() => {});

    // Keep refs in sync without causing re-renders
    onItemPressRef.current = (url: string) => {
      if (isSelectionMode) {
        setSelectedMedia((prev) => {
          const next = new Set(prev);
          if (next.has(url)) next.delete(url);
          else next.add(url);
          if (next.size === 0) setIsSelectionMode(false);
          return next;
        });
      } else {
        onSelectMedia?.(url);
      }
    };

    onItemLongPressRef.current = (url: string) => {
      setIsSelectionMode(true);
      setSelectedMedia(new Set([url]));
    };

    // Expose present/dismiss
    useImperativeHandle(ref, () => ({
      present: () => {
        needsLoadRef.current = true;
        sheetRef.current?.present();
      },
      dismiss: () => {
        sheetRef.current?.dismiss();
      },
    }), []);

    const handleSheetChange = useCallback((index: number) => {
      if (index === 0 && needsLoadRef.current) {
        // Sheet animation settled — now safe to load data
        needsLoadRef.current = false;
        if (workflowId) {
          loadHistoryMedia(serverId, workflowId).then(setMediaItems);
        }
      }
      if (index === -1) {
        // Sheet closed — reset all state
        setIsSelectionMode(false);
        setSelectedMedia(new Set());
        setMediaItems([]);
      }
    }, [serverId, workflowId]);

    const exitSelectionMode = useCallback(() => {
      setIsSelectionMode(false);
      setSelectedMedia(new Set());
    }, []);

    const confirmDelete = useCallback(async () => {
      if (!workflowId || selectedMedia.size === 0) return;
      try {
        for (const url of selectedMedia) {
          try { new File(url).delete(); } catch { /* ignore */ }
          try { new File(`${url}.json`).delete(); } catch { /* ignore */ }
        }
        const updatedMedia = await loadHistoryMedia(serverId, workflowId);
        setMediaItems(updatedMedia);
        setSelectedMedia(new Set());
        setIsSelectionMode(false);
        setIsDeleteAlertOpen(false);
      } catch {
        showToast.error('Delete Failed', 'Failed to delete media', insets.top + 8);
      }
    }, [selectedMedia, serverId, workflowId, insets.top]);

    const handleShare = useCallback(async () => {
      if (selectedMedia.size === 0) return;
      try {
        const isAvailable = await Sharing.isAvailableAsync();
        if (!isAvailable) {
          showToast.error('Not available', 'Sharing is not supported on this device', insets.top + 8);
          return;
        }
        await Sharing.shareAsync(selectedMedia.values().next().value!);
      } catch { /* ignore */ }
    }, [insets.top, selectedMedia]);

    const handleSave = useCallback(async () => {
      if (selectedMedia.size === 0) return;
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        showToast.error('Permission required', 'Please allow access to save media', insets.top + 8);
        return;
      }
      let savedCount = 0;
      try {
        for (const url of selectedMedia) {
          await MediaLibrary.saveToLibraryAsync(url);
          savedCount++;
        }
        showToast.success('Saved', `Saved ${savedCount} item${savedCount > 1 ? 's' : ''} to Photos`, insets.top + 8);
        setIsSelectionMode(false);
        setSelectedMedia(new Set());
      } catch {
        showToast.error('Save Failed', 'Failed to save some media', insets.top + 8);
      }
    }, [insets.top, selectedMedia]);

    const renderItem = useCallback(
      ({ item, index }: { item: { url: string; timestamp: number }; index: number }) => (
        <View style={{ flex: 1, padding: GRID_GAP / 2 }}>
          <HistoryItem
            url={item.url}
            index={index}
            isSelectionMode={isSelectionMode}
            isSelected={selectedMedia.has(item.url)}
            onPress={onItemPressRef.current}
            onLongPress={onItemLongPressRef.current}
          />
        </View>
      ),
      [isSelectionMode, selectedMedia],
    );

    const snapPoints = useMemo(() => ['90%'], []);
    const hasSelection = selectedMedia.size > 0;

    return (
      <>
        <ThemedBottomSheetModal
          ref={sheetRef}
          index={0}
          snapPoints={snapPoints}
          topInset={insets.top}
          enablePanDownToClose
          onChange={handleSheetChange}
          enableDynamicSizing={false}
          animationConfigs={{ duration: 250 }}
        >
          {/* Header */}
          <BottomSheetView style={{ paddingHorizontal: HORIZONTAL_PADDING, paddingBottom: 4 }}>
            <View className="flex-row items-center py-2">
              <View className="flex-1 flex-row items-center gap-2">
                <Icon as={History} size="sm" className="text-typography-800" />
                <Text className="text-base font-medium text-typography-800">
                  {isSelectionMode ? `${selectedMedia.size} selected` : 'History'}
                </Text>
              </View>

              {isSelectionMode ? (
                <View className="flex-row items-center gap-1">
                  <Pressable
                    onPress={handleShare}
                    disabled={!hasSelection}
                    className="h-8 w-8 items-center justify-center rounded-lg active:bg-background-100"
                    style={{ opacity: hasSelection ? 1 : 0.3 }}
                  >
                    <Icon as={Share} size="sm" className="text-primary-500" />
                  </Pressable>
                  <Pressable
                    onPress={handleSave}
                    disabled={!hasSelection}
                    className="h-8 w-8 items-center justify-center rounded-lg active:bg-background-100"
                    style={{ opacity: hasSelection ? 1 : 0.3 }}
                  >
                    <Icon as={Download} size="sm" className="text-primary-500" />
                  </Pressable>
                  <Pressable
                    onPress={() => setIsDeleteAlertOpen(true)}
                    disabled={!hasSelection}
                    className="h-8 w-8 items-center justify-center rounded-lg active:bg-background-100"
                    style={{ opacity: hasSelection ? 1 : 0.3 }}
                  >
                    <Icon as={Trash2} size="sm" className="text-error-500" />
                  </Pressable>
                  <Pressable
                    onPress={exitSelectionMode}
                    className="ml-1 h-8 items-center justify-center rounded-lg px-3 bg-primary-500 active:bg-primary-600"
                  >
                    <Text className="text-xs font-semibold text-white">Done</Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  onPress={() => setIsSelectionMode(true)}
                  className="h-8 items-center justify-center rounded-lg px-3 active:bg-background-100"
                >
                  <Text className="text-sm font-medium text-primary-500">Select</Text>
                </Pressable>
              )}
            </View>
          </BottomSheetView>

          {/* Grid */}
          <BottomSheetFlatList
            data={mediaItems}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            numColumns={NUM_COLUMNS}
            removeClippedSubviews
            contentContainerStyle={listContentStyle}
            initialNumToRender={9}
            maxToRenderPerBatch={6}
            windowSize={5}
          />
        </ThemedBottomSheetModal>

        <DeleteAlert
          isOpen={isDeleteAlertOpen}
          onClose={() => setIsDeleteAlertOpen(false)}
          onConfirm={confirmDelete}
          title={selectedMedia.size > 1 ? 'Delete Selected Media' : 'Delete Media'}
          description={
            selectedMedia.size > 1
              ? `Are you sure you want to delete ${selectedMedia.size} items? This action cannot be undone.`
              : 'Are you sure you want to delete this item? This action cannot be undone.'
          }
        />
      </>
    );
  },
);

// Stable references outside component to avoid re-creation
const keyExtractor = (item: { url: string }) => item.url;
const listContentStyle = {
  paddingHorizontal: HORIZONTAL_PADDING - GRID_GAP / 2,
  paddingBottom: 40,
};

HistoryGallerySheet.displayName = 'HistoryGallerySheet';
