import { ThemedBottomSheetModal } from '@/components/self-ui/themed-bottom-sheet-modal';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { loadHistoryMedia } from '@/services/image-storage';
import { showToast } from '@/utils/toast';
import { File } from 'expo-file-system';
import * as Haptics from 'expo-haptics';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { Download, History, Share, Trash2 } from 'lucide-react-native';
import React, { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Pressable, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomSheetModal, BottomSheetScrollView, BottomSheetView } from '@gorhom/bottom-sheet';
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
const LONG_PRESS_DURATION = 300;

export const HistoryGallerySheet = forwardRef<HistoryGallerySheetRef, HistoryGallerySheetProps>(
  ({ serverId, workflowId, onSelectMedia }, ref) => {
    const insets = useSafeAreaInsets();
    const sheetRef = useRef<BottomSheetModal>(null);
    const needsLoadRef = useRef(false);
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedMedia, setSelectedMedia] = useState<Set<string>>(new Set());
    const [mediaItems, setMediaItems] = useState<{ url: string; timestamp: number }[]>([]);
    const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
    const [scrollEnabled, setScrollEnabled] = useState(true);

    // Always-current refs for use inside gesture callbacks
    const isSelectionModeRef = useRef(isSelectionMode);
    isSelectionModeRef.current = isSelectionMode;
    const mediaItemsRef = useRef(mediaItems);
    mediaItemsRef.current = mediaItems;
    const selectedMediaRef = useRef(selectedMedia);
    selectedMediaRef.current = selectedMedia;

    // --- Drag-to-select state ---
    const isDragging = useSharedValue(false);
    const anchorIndex = useSharedValue(-1);
    const lastIndex = useSharedValue(-1);
    // Snapshot of selection before drag started
    const preDragSelectionRef = useRef<Set<string>>(new Set());

    const { width: windowWidth } = useWindowDimensions();
    const itemSize = (windowWidth - HORIZONTAL_PADDING * 2 - GRID_GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS;
    const cellSize = itemSize + GRID_GAP; // item + gap stride

    // Map touch coordinates (relative to grid container) to a flat item index
    const hitTest = useCallback((x: number, y: number): number => {
      const col = Math.floor(x / cellSize);
      const row = Math.floor(y / cellSize);
      if (col < 0 || col >= NUM_COLUMNS || row < 0) return -1;
      const idx = row * NUM_COLUMNS + col;
      if (idx >= mediaItemsRef.current.length) return -1;
      return idx;
    }, [cellSize]);

    // Select range from anchor to current index (inclusive)
    const selectRange = useCallback((from: number, to: number) => {
      const items = mediaItemsRef.current;
      const min = Math.min(from, to);
      const max = Math.max(from, to);
      const next = new Set(preDragSelectionRef.current);
      for (let i = min; i <= max; i++) {
        const url = items[i]?.url;
        if (url) next.add(url);
      }
      setSelectedMedia(next);
    }, []);

    const onDragStart = useCallback((idx: number) => {
      preDragSelectionRef.current = new Set(selectedMediaRef.current);
      if (!isSelectionModeRef.current) {
        setIsSelectionMode(true);
        preDragSelectionRef.current = new Set();
      }
      setScrollEnabled(false);
      const url = mediaItemsRef.current[idx]?.url;
      if (url) {
        const next = new Set(preDragSelectionRef.current);
        next.add(url);
        setSelectedMedia(next);
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }, []);

    const onDragUpdate = useCallback((idx: number, anchor: number) => {
      selectRange(anchor, idx);
      Haptics.selectionAsync();
    }, [selectRange]);

    const onDragEnd = useCallback(() => {
      setScrollEnabled(true);
    }, []);

    // Pan gesture activated after long press — for drag-to-select
    const dragGesture = useMemo(() =>
      Gesture.Pan()
        .activateAfterLongPress(LONG_PRESS_DURATION)
        .onStart((e) => {
          const idx = hitTest(e.x, e.y);
          if (idx < 0) return;
          isDragging.value = true;
          anchorIndex.value = idx;
          lastIndex.value = idx;
          runOnJS(onDragStart)(idx);
        })
        .onUpdate((e) => {
          if (!isDragging.value) return;
          const idx = hitTest(e.x, e.y);
          if (idx < 0 || idx === lastIndex.value) return;
          lastIndex.value = idx;
          runOnJS(onDragUpdate)(idx, anchorIndex.value);
        })
        .onEnd(() => {
          isDragging.value = false;
          anchorIndex.value = -1;
          lastIndex.value = -1;
          runOnJS(onDragEnd)();
        })
        .onFinalize(() => {
          isDragging.value = false;
          runOnJS(onDragEnd)();
        }),
    [hitTest, isDragging, anchorIndex, lastIndex, onDragStart, onDragUpdate, onDragEnd]);

    // --- Normal press/long-press handlers (for tap-to-toggle & single long-press) ---
    const onItemPressRef = useRef<(url: string) => void>(() => {});
    onItemPressRef.current = (url: string) => {
      if (isSelectionModeRef.current) {
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

    // Long press on individual item (fallback — drag gesture handles most cases)
    const onItemLongPressRef = useRef<(url: string) => void>(() => {});
    onItemLongPressRef.current = (_url: string) => {
      // Drag gesture handles long-press-initiated selection;
      // individual item long press is a no-op to avoid conflicts.
    };

    const stableOnPress = useCallback((url: string) => onItemPressRef.current(url), []);
    const stableOnLongPress = useCallback((url: string) => onItemLongPressRef.current(url), []);

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
        needsLoadRef.current = false;
        if (workflowId) {
          loadHistoryMedia(serverId, workflowId).then(setMediaItems);
        }
      }
      if (index === -1) {
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

    // Chunk media into rows of NUM_COLUMNS
    const rows = useMemo(() => {
      const result: (typeof mediaItems)[] = [];
      for (let i = 0; i < mediaItems.length; i += NUM_COLUMNS) {
        result.push(mediaItems.slice(i, i + NUM_COLUMNS));
      }
      return result;
    }, [mediaItems]);

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
          <BottomSheetView style={{ paddingHorizontal: HORIZONTAL_PADDING, paddingBottom: 4 }}>
            <View className="flex-row items-center py-2">
              <View className="flex-1 flex-row items-center gap-2">
                <Icon as={History} size="sm" className="text-typography-800" />
                <Text className="text-base font-medium text-typography-800">
                  {isSelectionMode
                    ? `${selectedMedia.size} selected`
                    : 'History'}
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

          <BottomSheetScrollView
            scrollEnabled={scrollEnabled}
            contentContainerStyle={{
              paddingHorizontal: HORIZONTAL_PADDING,
              paddingBottom: 40,
            }}
          >
            <GestureDetector gesture={dragGesture}>
              <View>
                {rows.map((row, rowIndex) => (
                  <View
                    key={rowIndex}
                    style={{
                      flexDirection: 'row',
                      marginBottom: GRID_GAP,
                    }}
                  >
                    {row.map((item, colIndex) => {
                      const index = rowIndex * NUM_COLUMNS + colIndex;
                      return (
                        <View
                          key={item.url}
                          style={{
                            width: itemSize,
                            height: itemSize,
                            marginLeft: colIndex > 0 ? GRID_GAP : 0,
                          }}
                        >
                          <HistoryItem
                            url={item.url}
                            index={index}
                            isSelectionMode={isSelectionMode}
                            isSelected={selectedMedia.has(item.url)}
                            onPress={stableOnPress}
                            onLongPress={stableOnLongPress}
                          />
                        </View>
                      );
                    })}
                  </View>
                ))}
              </View>
            </GestureDetector>
          </BottomSheetScrollView>
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

HistoryGallerySheet.displayName = 'HistoryGallerySheet';
