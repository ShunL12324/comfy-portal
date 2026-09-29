import { AdaptiveScrollView } from '@/components/self-ui/adaptive-sheet-components';
import { ConfirmDialog } from '@/components/self-ui/confirm-dialog';
import { ThemedBottomSheetModal } from '@/components/self-ui/themed-bottom-sheet-modal';
import { Action, Copy, useDesign } from '@/components/ui/design-system/primitives';
import { RotatingSpinner } from '@/components/ui/rotating-spinner';
import { useGenerationActions, useGenerationStatus } from '@/features/generation/context/generation-context';
import { QueueItem } from '@/services/comfy-client';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { Trash2, X } from '@/constants/icons';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { designTokens as t } from '@/constants/design-tokens';

interface ParsedQueueItem {
  promptId: string;
  isRunning: boolean;
}

function parseQueueItems(running: QueueItem[], pending: QueueItem[]): ParsedQueueItem[] {
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
  const c = useDesign();
  const { getQueue, deleteQueueItems, clearQueue, cancel } = useGenerationActions();
  const insets = useSafeAreaInsets();

  const sheetRef = useRef<BottomSheetModal>(null);
  const [items, setItems] = useState<ParsedQueueItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);
  const isOpenRef = useRef(false);

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getQueue();
      setItems(parseQueueItems(data.queue_running, data.queue_pending));
    } catch {
      setError('Could not load the queue. Try refreshing.');
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
      } catch {
        setError('Could not cancel this job. Refresh its status and retry.');
      }
    },
    [cancel, deleteQueueItems, fetchQueue],
  );

  const handleClearAll = useCallback(async () => {
    try {
      await cancel();
      await clearQueue();
      await fetchQueue();
    } catch {
      setError('Could not clear the queue. Refresh and retry.');
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
        accessibilityRole="button"
        accessibilityLabel={`Open queue, ${queueRemaining} jobs`}
        onPress={handleOpen}
        style={{ width: t.height.touch, height: t.height.touch, alignItems: 'center', justifyContent: 'center' }}
      >
        <View
          testID="queue-surface"
          style={{
            width: t.height.small,
            height: t.height.small,
            borderRadius: t.radius.pill,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: queueRemaining > 0 ? c.warning : c.workspaceCard,
          }}
        >
          <Copy size="micro" style={{ fontWeight: '600', color: queueRemaining > 0 ? c.onWarning : c.secondary }}>
            {queueRemaining > 99 ? '99+' : queueRemaining}
          </Copy>
        </View>
      </Pressable>

      <ThemedBottomSheetModal
        ref={sheetRef}
        index={0}
        enableDynamicSizing
        topInset={insets.top}
        enablePanDownToClose
        onDismiss={handleDismiss}
      >
        <AdaptiveScrollView
          contentContainerStyle={{ paddingHorizontal: t.layout.inset, paddingBottom: insets.bottom + t.layout.inset }}
        >
          <Copy style={{ fontWeight: '500', marginBottom: t.layout.field }}>Queue · {items.length}</Copy>
          {!!error && (
            <>
              <Copy accessibilityRole="alert">{error}</Copy>
              <Action kind="text" loading={loading} onPress={fetchQueue}>
                Retry
              </Action>
            </>
          )}
          {/* List */}
          {loading && items.length === 0 ? (
            <View className="gap-2 py-6 flex-row items-center justify-center">
              <RotatingSpinner size="sm" />
            </View>
          ) : items.length === 0 ? (
            <View className="py-6 items-center">
              <Copy muted>Queue is empty</Copy>
            </View>
          ) : (
            items.map((item, index) => (
              <QueueRow key={item.promptId} item={item} index={index} onDelete={() => handleDelete(item)} />
            ))
          )}
          {items.length > 0 && (
            <Action kind="secondary" destructive fill onPress={() => setConfirmClear(true)}>
              Clear all
            </Action>
          )}
        </AdaptiveScrollView>
      </ThemedBottomSheetModal>
      <ConfirmDialog
        isOpen={confirmClear}
        onClose={() => setConfirmClear(false)}
        onConfirm={() => {
          setConfirmClear(false);
          void handleClearAll();
        }}
        destructive
        title="Cancel all jobs?"
        description="This interrupts the running job and removes every waiting job from the server queue."
        confirmText="Cancel all jobs"
      />
    </>
  );
});

QueueBadge.displayName = 'QueueBadge';

function QueueRow({ item, index, onDelete }: { item: ParsedQueueItem; index: number; onDelete: () => void }) {
  const c = useDesign();
  return (
    <View
      style={{
        marginBottom: t.layout.list,
        backgroundColor: c.card,
        padding: t.layout.field,
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: t.radius.panel,
      }}
    >
      <View style={{ flex: 1, gap: t.layout.label }}>
        <Copy>Task {index + 1}</Copy>
        <Copy muted size="metadata">
          {item.isRunning ? 'Running' : 'Waiting'}
        </Copy>
      </View>
      <Action
        kind="text"
        icon={item.isRunning ? X : Trash2}
        label={item.isRunning ? 'Cancel running job' : 'Remove queued job'}
        onPress={onDelete}
      />
    </View>
  );
}
