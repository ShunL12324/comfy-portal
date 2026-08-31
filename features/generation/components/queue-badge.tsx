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
        className={`ml-1.5 h-8 w-8 items-center justify-center rounded-full active:opacity-80 ${
          queueRemaining > 0
            ? 'bg-status-busy'
            : 'bg-surface-sunken active:bg-surface-muted'
        }`}
      >
        <Text
          className={`text-[10px] font-bold ${
            queueRemaining > 0 ? 'text-white' : 'text-content-secondary'
          }`}
        >
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
            <Text className="text-sm font-semibold text-content-heading">
              Queue
            </Text>
            {items.length > 0 && (
              <Pressable
                onPress={handleClearAll}
                className="flex-row items-center gap-1 rounded-lg px-2 py-1 active:bg-surface-sunken"
              >
                <Icon as={Trash2} size="2xs" className="text-status-danger" />
                <Text className="text-xs font-medium text-status-danger">
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
              <Text className="text-sm text-content-tertiary">
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
    <View className="mb-1.5 flex-row items-center justify-between rounded-xl bg-surface-raised px-4 py-3">
      <View className="flex-1 flex-row items-center gap-3">
        {item.isRunning ? (
          <RotatingSpinner size="sm" />
        ) : (
          <Icon as={Clock} size="xs" className="text-content-tertiary" />
        )}
        <View className="flex-1">
          <Text
            className="text-sm font-medium text-content-body"
            numberOfLines={1}
          >
            {item.promptId.slice(0, 8)}...
          </Text>
          <Text className="text-xs text-content-tertiary">
            {item.isRunning ? 'Running' : 'Pending'}
          </Text>
        </View>
      </View>
      <Pressable
        onPress={onDelete}
        className="ml-2 rounded-lg p-1.5 active:bg-surface-muted"
      >
        <Icon as={X} size="xs" className="text-content-tertiary" />
      </Pressable>
    </View>
  );
}
