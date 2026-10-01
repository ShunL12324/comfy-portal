import { AppBar } from '@/components/layout/app-bar';
import { Action, Copy, Row } from '@/components/ui/design-system/primitives';
import { Spinner } from '@/components/ui/spinner';
import { DeleteAlert } from '@/features/generation/components/history-drawer/delete-alert';
import { HistoryItem } from '@/features/generation/components/history-drawer/history-item';
import { MediaViewer, toViewerItem, type MediaViewerItem } from '@/features/gallery/components/media-viewer';
import { deleteGeneratedMedia, loadHistoryMedia } from '@/services/image-storage';
import * as MediaLibrary from '@/services/media-library';
import { showToast } from '@/utils/toast';
import { useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { Download, Share, Trash2 } from '@/constants/icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { designTokens as t } from '@/constants/design-tokens';

const NUM_COLUMNS = 3;
const GRID_GAP = t.layout.label;
const HORIZONTAL_PADDING = t.layout.gutter;

const listContentStyle = {
  paddingHorizontal: HORIZONTAL_PADDING - GRID_GAP / 2,
  paddingBottom: t.layout.section,
};

export default function HistoryGalleryPage() {
  const { serverId, workflowId } = useLocalSearchParams<{ serverId: string; workflowId: string }>();
  const insets = useSafeAreaInsets();

  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<Set<string>>(new Set());
  const [mediaItems, setMediaItems] = useState<{ url: string; timestamp: number }[]>([]);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);

  // The viewer pages through the whole history, so it opens at an index into `mediaItems`.
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);
  const viewerItems = useMemo(() => mediaItems.map((item) => toViewerItem(item.url)), [mediaItems]);
  const closePreview = useCallback(() => setIsPreviewOpen(false), []);

  const onItemPress = useCallback(
    (url: string) => {
      if (isSelectionMode) {
        const next = new Set(selectedMedia);
        if (next.has(url)) next.delete(url);
        else next.add(url);
        setSelectedMedia(next);
        if (!next.size) setIsSelectionMode(false);
      } else {
        const index = Math.max(
          mediaItems.findIndex((item) => item.url === url),
          0,
        );
        setPreviewIndex(index);
        setIsPreviewOpen(true);
      }
    },
    [isSelectionMode, selectedMedia, mediaItems],
  );
  const onItemLongPress = useCallback((url: string) => {
    setIsSelectionMode(true);
    setSelectedMedia(new Set([url]));
  }, []);

  const reload = async () => {
    setLoaded(false);
    try {
      setMediaItems(await loadHistoryMedia(serverId, workflowId));
      setLoadError('');
    } catch {
      setLoadError('Saved results could not be loaded.');
    } finally {
      setLoaded(true);
    }
  };
  useEffect(() => {
    let active = true;
    loadHistoryMedia(serverId, workflowId)
      .then((items) => {
        if (active) {
          setMediaItems(items);
          setLoadError('');
        }
      })
      .catch(() => {
        if (active) setLoadError('Saved results could not be loaded.');
      })
      .finally(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, [serverId, workflowId]);

  const exitSelectionMode = useCallback(() => {
    setIsSelectionMode(false);
    setSelectedMedia(new Set());
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!workflowId || selectedMedia.size === 0) return;
    try {
      await deleteGeneratedMedia([...selectedMedia]);
      const updatedMedia = await loadHistoryMedia(serverId, workflowId);
      setMediaItems(updatedMedia);
      setSelectedMedia(new Set());
      setIsSelectionMode(false);
      setIsDeleteAlertOpen(false);
    } catch {
      showToast.error('Delete Failed', 'Failed to delete media');
    }
  }, [selectedMedia, serverId, workflowId]);

  const handleShare = useCallback(async () => {
    if (selectedMedia.size === 0) return;
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        showToast.error('Not available', 'Sharing is not supported on this device');
        return;
      }
      await Sharing.shareAsync(selectedMedia.values().next().value!);
    } catch {
      /* ignore */
    }
  }, [insets.top, selectedMedia]);

  const handleSave = useCallback(async () => {
    if (selectedMedia.size === 0) return;
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== 'granted') {
      showToast.error('Permission required', 'Please allow access to save media');
      return;
    }
    let savedCount = 0;
    try {
      for (const url of selectedMedia) {
        await MediaLibrary.saveToLibraryAsync(url);
        savedCount++;
      }
      showToast.success('Saved', `Saved ${savedCount} item${savedCount > 1 ? 's' : ''} to Photos`);
      setIsSelectionMode(false);
      setSelectedMedia(new Set());
    } catch {
      showToast.error('Save Failed', 'Failed to save some media');
    }
  }, [insets.top, selectedMedia]);

  // Deleting from the viewer reuses the selection delete flow with that one item.
  const deleteFromViewer = useCallback((item: MediaViewerItem) => {
    setSelectedMedia(new Set([item.uri]));
    setIsDeleteAlertOpen(true);
  }, []);

  const closeDeleteAlert = useCallback(() => {
    setIsDeleteAlertOpen(false);
    // A cancelled delete from the viewer must not leave a stray selection behind.
    if (!isSelectionMode) setSelectedMedia(new Set());
  }, [isSelectionMode]);

  const renderItem = useCallback(
    ({ item, index }: { item: { url: string; timestamp: number }; index: number }) => (
      <View style={{ flex: 1, padding: GRID_GAP / 2 }}>
        <HistoryItem
          url={item.url}
          index={index}
          isSelectionMode={isSelectionMode}
          isSelected={selectedMedia.has(item.url)}
          onPress={onItemPress}
          onLongPress={onItemLongPress}
        />
      </View>
    ),
    [isSelectionMode, selectedMedia, onItemPress, onItemLongPress],
  );

  const hasSelection = selectedMedia.size > 0;

  const rightElement = (
    <Action kind="text" small onPress={isSelectionMode ? exitSelectionMode : () => setIsSelectionMode(true)}>
      {isSelectionMode ? 'Done' : 'Select'}
    </Action>
  );

  return (
    // iOS presents this screen as a native form sheet; sheets opened from it must render inside it, not behind it.
    <BottomSheetModalProvider>
      <View collapsable={false} className="bg-surface-base flex-1">
        <View collapsable={false}>
          <AppBar
            title={isSelectionMode ? `${selectedMedia.size} selected` : 'History'}
            titleSize="sm"
            rightElement={rightElement}
            bottomElement={
              isSelectionMode ? (
                <Row style={{ gap: t.layout.related }}>
                  <Action kind="secondary" icon={Share} disabled={!hasSelection} onPress={handleShare}>
                    Share
                  </Action>
                  <Action kind="secondary" icon={Download} disabled={!hasSelection} onPress={handleSave}>
                    Save
                  </Action>
                  <Action kind="text" icon={Trash2} disabled={!hasSelection} onPress={() => setIsDeleteAlertOpen(true)}>
                    Delete
                  </Action>
                </Row>
              ) : undefined
            }
          />
        </View>

        {/* Grid */}
        <FlatList
          data={mediaItems}
          ListEmptyComponent={
            <View style={{ padding: t.layout.inset }}>
              {!loaded ? (
                <Spinner />
              ) : loadError ? (
                <View style={{ gap: t.layout.related }}>
                  <Copy>{loadError}</Copy>
                  <Action onPress={reload}>Try again</Action>
                </View>
              ) : (
                <Copy muted>No saved results for this workflow yet.</Copy>
              )}
            </View>
          }
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          numColumns={NUM_COLUMNS}
          removeClippedSubviews
          contentContainerStyle={listContentStyle}
          initialNumToRender={12}
          maxToRenderPerBatch={9}
          windowSize={5}
        />

        {/* An overlay rather than a modal: this screen is itself a native form
          sheet, and a modal nested in one never renders video. It sits inside
          BottomSheetModalProvider, so the delete confirmation stacks above it. */}
        <MediaViewer
          presentation="overlay"
          items={viewerItems}
          initialIndex={previewIndex}
          visible={isPreviewOpen}
          onClose={closePreview}
          workflowId={workflowId}
          serverId={serverId}
          onDelete={deleteFromViewer}
        />

        <DeleteAlert
          isOpen={isDeleteAlertOpen}
          onClose={closeDeleteAlert}
          onConfirm={confirmDelete}
          title={selectedMedia.size > 1 ? 'Delete Selected Media' : 'Delete Media'}
          description={
            selectedMedia.size > 1
              ? `Are you sure you want to delete ${selectedMedia.size} items? This action cannot be undone.`
              : 'Are you sure you want to delete this item? This action cannot be undone.'
          }
        />
      </View>
    </BottomSheetModalProvider>
  );
}

const keyExtractor = (item: { url: string }) => item.url;
