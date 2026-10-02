import { Action, Copy } from '@/components/ui/design-system/primitives';
import { Spinner } from '@/components/ui/spinner';
import { MediaSelectionAppBar } from '@/features/gallery/components/media-selection-app-bar';
import { MediaTile } from '@/features/gallery/components/media-tile';
import { MediaViewer, toViewerItem, type MediaViewerItem } from '@/features/gallery/components/media-viewer';
import { useMediaSelection } from '@/features/gallery/hooks/use-media-selection';
import { useMediaTileRects } from '@/features/gallery/hooks/use-media-tile-rects';
import { deleteGeneratedMedia, loadHistoryMedia } from '@/services/image-storage';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, View } from 'react-native';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { designTokens as t } from '@/constants/design-tokens';

type HistoryItem = { url: string; timestamp: number };

const NUM_COLUMNS = 3;
const GRID_GAP = t.layout.label;
const HORIZONTAL_PADDING = t.layout.gutter;

const listContentStyle = {
  paddingHorizontal: HORIZONTAL_PADDING - GRID_GAP / 2,
  paddingBottom: t.layout.section,
};

export default function HistoryGalleryPage() {
  const { serverId, workflowId } = useLocalSearchParams<{ serverId: string; workflowId: string }>();

  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [mediaItems, setMediaItems] = useState<HistoryItem[]>([]);

  // The viewer pages through the whole history, so it opens at an index into `mediaItems`.
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);
  const viewerItems = useMemo(() => mediaItems.map((item) => toViewerItem(item.url)), [mediaItems]);
  const ids = useMemo(() => mediaItems.map((item) => item.url), [mediaItems]);
  const selection = useMediaSelection(ids);
  const { listRef: gridRef, registerTile, getOriginRect } = useMediaTileRects<HistoryItem>();
  const { active: selecting, toggle, begin } = selection;
  const closePreview = useCallback(() => setIsPreviewOpen(false), []);

  const onItemPress = useCallback(
    (url: string) => {
      if (selecting) return toggle(url);
      setPreviewIndex(Math.max(ids.indexOf(url), 0));
      setIsPreviewOpen(true);
    },
    [selecting, toggle, ids],
  );

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

  /** Deletes files and index entries, then shows what is left. */
  const deleteMedia = useCallback(
    async (urls: string[]) => {
      await deleteGeneratedMedia(urls);
      setMediaItems(await loadHistoryMedia(serverId, workflowId));
    },
    [serverId, workflowId],
  );
  const deleteFromViewer = useCallback((item: MediaViewerItem) => deleteMedia([item.uri]), [deleteMedia]);

  const renderItem = useCallback(
    ({ item, index }: { item: { url: string }; index: number }) => (
      <View style={{ flex: 1, padding: GRID_GAP / 2 }}>
        <MediaTile
          uri={item.url}
          kind={viewerItems[index]?.kind ?? 'image'}
          selecting={selecting}
          selected={selection.isSelected(item.url)}
          onPress={onItemPress}
          onLongPress={begin}
          onTileRef={registerTile}
        />
      </View>
    ),
    // `selection.isSelected` changes identity with every selection change.
    [viewerItems, selecting, selection, onItemPress, begin, registerTile],
  );

  return (
    // iOS presents this screen as a native form sheet; sheets opened from it must render inside it, not behind it.
    <BottomSheetModalProvider>
      <View collapsable={false} className="bg-surface-base flex-1">
        <View collapsable={false}>
          <MediaSelectionAppBar
            title="History"
            titleSize="sm"
            selection={selection}
            onDelete={deleteMedia}
            idleRightElement={
              mediaItems.length > 0 ? (
                <Action kind="secondary" small onPress={() => begin()}>
                  Select
                </Action>
              ) : undefined
            }
          />
        </View>

        {/* Grid */}
        <FlatList
          ref={gridRef}
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
          sheet, and a modal nested in one never renders video. */}
        <MediaViewer
          presentation="overlay"
          items={viewerItems}
          initialIndex={previewIndex}
          visible={isPreviewOpen}
          onClose={closePreview}
          getOriginRect={getOriginRect}
          workflowId={workflowId}
          serverId={serverId}
          onDelete={deleteFromViewer}
        />
      </View>
    </BottomSheetModalProvider>
  );
}

const keyExtractor = (item: { url: string }) => item.url;
