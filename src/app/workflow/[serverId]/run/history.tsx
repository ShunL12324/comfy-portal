import { AppBar } from '@/components/layout/app-bar';
import { Action, Copy, Row, useDesign } from '@/components/ui/design-system/primitives';
import { Icon } from '@/components/ui/icon';
import { Spinner } from '@/components/ui/spinner';
import { DeleteAlert } from '@/features/generation/components/history-drawer/delete-alert';
import { HistoryItem } from '@/features/generation/components/history-drawer/history-item';
import { MediaActions } from '@/features/generation/components/media-preview/media-actions';
import { ZoomableMedia } from '@/features/generation/components/media-preview/zoomable-media';
import { deleteGeneratedMedia, loadHistoryMedia } from '@/services/image-storage';
import * as MediaLibrary from '@/services/media-library';
import { showToast } from '@/utils/toast';
import { useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { Download, Share, Trash2, X } from '@/constants/icons';
import { AnimatePresence, MotiView } from 'moti';
import { useCallback, useEffect, useState } from 'react';
import {
  BackHandler,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { designTokens as t } from '@/constants/design-tokens';
import { Pressable } from '@/components/ui/pressable';

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
  const c = useDesign();
  const { width: screenWidth } = useWindowDimensions();

  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<Set<string>>(new Set());
  const [mediaItems, setMediaItems] = useState<{ url: string; timestamp: number }[]>([]);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);

  // Preview state. The preview pages through the whole gallery, so what it
  // shows is an index into `mediaItems` rather than a single URL.
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [showMediaActions, setShowMediaActions] = useState(false);
  // Hold the opening index while the pager is mounted; swiping updates only previewIndex.
  const [initialPreviewIndex, setInitialPreviewIndex] = useState(0);
  const previewUrl = mediaItems[previewIndex]?.url;

  // The preview is an in-tree overlay rather than a Modal, so Android's back
  // gesture isn't intercepted for us — without this it would pop the whole
  // gallery instead of closing the image.
  const closePreview = useCallback(() => {
    setIsPreviewOpen(false);
    setShowMediaActions(false);
  }, []);

  useEffect(() => {
    if (!isPreviewOpen) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      closePreview();
      return true;
    });
    return () => subscription.remove();
  }, [isPreviewOpen, closePreview]);

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
        setInitialPreviewIndex(index);
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

  const handlePreviewScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      setPreviewIndex(Math.round(event.nativeEvent.contentOffset.x / screenWidth));
    },
    [screenWidth],
  );

  const renderPreviewPage = useCallback(
    ({ item, index }: { item: { url: string; timestamp: number }; index: number }) => (
      <View style={{ width: screenWidth }}>
        <ZoomableMedia
          mediaUrl={item.url}
          isActive={index === previewIndex}
          onClose={closePreview}
          onLongPress={() => setShowMediaActions(true)}
        />
      </View>
    ),
    [screenWidth, previewIndex, closePreview],
  );

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

        {/* Fullscreen preview.
          A plain overlay rather than a Modal. This screen is already presented
          as a native modal, and nesting an RN Modal inside it puts VideoView in
          a separate native view hierarchy where the video layer never renders —
          videos played with sound over a black screen. The screen fills the
          modal already, so an absolutely positioned sibling covers everything
          without leaving the view tree.

          AnimatePresence keeps the overlay mounted through its exit animation,
          which a bare `isPreviewOpen && ...` cannot do — the children hold
          their last props while it plays.

          Backdrop and content animate separately on purpose. Fading the whole
          thing at once cross-dissolves the fullscreen media into the grid,
          which holds a thumbnail of that very same media — two copies of one
          image at two sizes, i.e. a ghost. So the content leaves first against
          opaque black, and only then does the black pull back. */}
        <AnimatePresence>
          {isPreviewOpen && (
            <MotiView
              key="preview"
              from={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ type: 'timing', duration: 150 }}
              exitTransition={{ type: 'timing', duration: 150, delay: 120 }}
              style={[StyleSheet.absoluteFill, { zIndex: 20, backgroundColor: c.media }]}
            >
              <MotiView
                from={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.92 }}
                transition={{ type: 'timing', duration: 200 }}
                exitTransition={{ type: 'timing', duration: 150 }}
                style={{ flex: 1 }}
              >
                {/* A paging FlatList rather than a PagerView (which the run
                  screen uses): a pager mounts every child, and a gallery can
                  hold hundreds of items — this only keeps a few pages alive.
                  Each page is exactly one screen wide, so getItemLayout is
                  arithmetic and initialScrollIndex lands on the tapped item
                  without a visible scroll. */}
                <FlatList
                  data={mediaItems}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  keyExtractor={keyExtractor}
                  initialScrollIndex={initialPreviewIndex}
                  getItemLayout={(_, index) => ({
                    length: screenWidth,
                    offset: screenWidth * index,
                    index,
                  })}
                  onMomentumScrollEnd={handlePreviewScrollEnd}
                  initialNumToRender={1}
                  maxToRenderPerBatch={2}
                  // Three pages is already a small enough window; the extra
                  // removeClippedSubviews has a history of blanking pages on
                  // horizontal iOS lists, so it isn't worth the trade here.
                  windowSize={3}
                  renderItem={renderPreviewPage}
                />

                {mediaItems.length > 1 && (
                  <View
                    pointerEvents="none"
                    style={{ position: 'absolute', top: insets.top + 12, left: 12, zIndex: 30 }}
                    className="bg-media/40 px-2.5 py-1.5 min-w-[52px] items-center rounded-full"
                  >
                    <Copy size="label" style={{ fontWeight: '500', color: c.onMedia }}>
                      {previewIndex + 1}/{mediaItems.length}
                    </Copy>
                  </View>
                )}

                <Pressable
                  onPress={closePreview}
                  className="active:opacity-pressed bg-media/30"
                  style={{
                    position: 'absolute',
                    top: insets.top + 12,
                    right: 12,
                    borderRadius: t.radius.control,
                    padding: t.layout.related,
                    zIndex: 30,
                  }}
                >
                  <Icon as={X} size="sm" className="text-on-media" />
                </Pressable>
              </MotiView>

              {/* Inside the overlay so it shares the stacking context: the panel
                positions itself absolutely with no z-index of its own, so as a
                sibling it would sit under the overlay on Android. Outside the
                animated content so dismissing it doesn't ride the scale. */}
              <MediaActions
                isOpen={showMediaActions}
                onClose={() => setShowMediaActions(false)}
                mediaUrl={previewUrl}
                workflowId={workflowId}
                serverId={serverId}
              />
            </MotiView>
          )}
        </AnimatePresence>

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
      </View>
    </BottomSheetModalProvider>
  );
}

const keyExtractor = (item: { url: string }) => item.url;
