import { ThemedBottomSheetModal } from '@/components/self-ui/themed-bottom-sheet-modal';
import { Icon } from '@/components/ui/icon';
import { RotatingSpinner } from '@/components/ui/rotating-spinner';
import { Text } from '@/components/ui/text';
import {
  useGenerationActions,
  useGenerationStatus,
} from '@/features/generation/context/generation-context';
import { QueueItem } from '@/services/comfy-client';
import { Clock, Trash2, X } from 'lucide-react-native';
import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';

interface ParsedQueueItem {
  promptId: string;
  isRunning: boolean;
}

function parseQueueItems(
  running: QueueItem[],
  pending: QueueItem[],
): ParsedQueueItem[] {
  const items: ParsedQueueItem[] = [];
  for (const item of running) {
    items.push({ promptId: item[1], isRunning: true });
  }
  for (const item of pending) {
    items.push({ promptId: item[1], isRunning: false });
  }
  return items;
}

export const QueueBadge = memo(() => {
  const { queueRemaining } = useGenerationStatus();
  const { getQueue, deleteQueueItems, clearQueue, cancel } =
    useGenerationActions();
  const insets = useSafeAreaInsets();

  const sheetRef = useRef<BottomSheetModal>(null);
  const [items, setItems] = useState<ParsedQueueItem[]>([]);
  const [loading, setLoading] = useState(false);
  const isOpenRef = useRef(false);

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getQueue();
      setItems(parseQueueItems(data.queue_running, data.queue_pending));
    } catch (e) {
      console.error('Failed to fetch queue:', e);
    } finally {
      setLoading(false);
    }
  }, [getQueue]);

  const handleOpen = useCallback(() => {
    isOpenRef.current = true;
    sheetRef.current?.present();
    fetchQueue();
  }, [fetchQueue]);

  const handleDismiss = useCallback(() => {
    isOpenRef.current = false;
  }, []);

  const handleDelete = useCallback(
    async (item: ParsedQueueItem) => {
      try {
        if (item.isRunning) {
          await cancel();
        } else {
          await deleteQueueItems([item.promptId]);
        }
        await fetchQueue();
      } catch (e) {
        console.error('Failed to delete queue item:', e);
      }
    },
    [cancel, deleteQueueItems, fetchQueue],
  );

  const handleClearAll = useCallback(async () => {
    try {
      await cancel();
      await clearQueue();
      await fetchQueue();
    } catch (e) {
      console.error('Failed to clear queue:', e);
    }
  }, [cancel, clearQueue, fetchQueue]);

  // Auto-refresh when sheet is open and queueRemaining changes
  useEffect(() => {
    if (isOpenRef.current) {
      fetchQueue();
    }
  }, [queueRemaining, fetchQueue]);

  return (
    <>
      <Pressable
        onPress={handleOpen}
        className="ml-1.5 h-8 w-8 items-center justify-center rounded-full bg-background-100 active:bg-background-200"
      >
        <Text className="text-[10px] font-bold text-typography-500">
          {queueRemaining}
        </Text>
      </Pressable>

      <ThemedBottomSheetModal
        ref={sheetRef}
        index={0}
        snapPoints={['34%']}
        topInset={insets.top}
        enablePanDownToClose
        onDismiss={handleDismiss}
      >
        <BottomSheetView style={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 16 }}>
          {/* Header */}
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-sm font-semibold text-typography-900">
              Queue
            </Text>
            {items.length > 0 && (
              <Pressable
                onPress={handleClearAll}
                className="flex-row items-center gap-1 rounded-lg px-2 py-1 active:bg-background-100"
              >
                <Icon as={Trash2} size="2xs" className="text-error-500" />
                <Text className="text-xs font-medium text-error-500">
                  Clear All
                </Text>
              </Pressable>
            )}
          </View>

          {/* List */}
          {loading && items.length === 0 ? (
            <View className="flex-row items-center justify-center gap-2 py-6">
              <RotatingSpinner size="sm" />
            </View>
          ) : items.length === 0 ? (
            <View className="items-center py-6">
              <Text className="text-sm text-typography-400">
                Queue is empty
              </Text>
            </View>
          ) : (
            items.map((item) => (
              <QueueRow
                key={item.promptId}
                item={item}
                onDelete={() => handleDelete(item)}
              />
            ))
          )}
        </BottomSheetView>
      </ThemedBottomSheetModal>
    </>
  );
});

QueueBadge.displayName = 'QueueBadge';

function QueueRow({
  item,
  onDelete,
}: {
  item: ParsedQueueItem;
  onDelete: () => void;
}) {
  return (
    <View className="mb-1.5 flex-row items-center justify-between rounded-xl bg-background-50 px-4 py-3">
      <View className="flex-1 flex-row items-center gap-3">
        {item.isRunning ? (
          <RotatingSpinner size="sm" />
        ) : (
          <Icon as={Clock} size="xs" className="text-typography-400" />
        )}
        <View className="flex-1">
          <Text
            className="text-sm font-medium text-typography-700"
            numberOfLines={1}
          >
            {item.promptId.slice(0, 8)}...
          </Text>
          <Text className="text-xs text-typography-400">
            {item.isRunning ? 'Running' : 'Pending'}
          </Text>
        </View>
      </View>
      <Pressable
        onPress={onDelete}
        className="ml-2 rounded-lg p-1.5 active:bg-background-200"
      >
        <Icon as={X} size="xs" className="text-typography-400" />
      </Pressable>
    </View>
  );
}
