import { AppBar } from '@/components/layout/app-bar';
import { Button, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { ZoomableMedia } from '@/features/generation/components/media-preview/zoomable-media';
import { MediaActions } from '@/features/generation/components/media-preview/media-actions';
import { useAssetGallery } from '@/features/generation/hooks/use-asset-gallery';
import { useServersStore } from '@/features/server/stores/server-store';
import type { GalleryMedia } from '@/services/comfy-assets';
import { downloadMediaOnWeb, withLocalMedia } from '@/services/media-export';
import { showToast } from '@/utils/toast';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { useLocalSearchParams } from 'expo-router';
import { Download, Share, Trash2, X } from 'lucide-react-native';
import { AnimatePresence, MotiView } from 'moti';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BackHandler,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DeleteAlert } from '@/features/generation/components/history-drawer/delete-alert';
import { HistoryItem } from '@/features/generation/components/history-drawer/history-item';

const NUM_COLUMNS = 3;
const GRID_GAP = 4;
const HORIZONTAL_PADDING = 16;

const listContentStyle = {
  paddingHorizontal: HORIZONTAL_PADDING - GRID_GAP / 2,
  paddingBottom: 40,
};

export default function HistoryGalleryPage() {
  const { serverId, workflowId } = useLocalSearchParams<{ serverId: string; workflowId?: string }>();
  const server = useServersStore((state) => state.servers.find((entry) => entry.id === serverId));
  const serverGallery = !workflowId;
  const { items: mediaItems, error, refreshing, isDeleting, assetsAvailable, refresh, deleteItems } =
    useAssetGallery(server, serverId, workflowId);
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();

  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<Set<string>>(new Set());
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);

  // Preview state. The preview pages through the whole gallery, so what it
  // shows is an index into `mediaItems` rather than a single URL.
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [showMediaActions, setShowMediaActions] = useState(false);
  // Read once when the pager mounts. Kept out of state because FlatList only
  // honours `initialScrollIndex` on mount, and feeding it a value that moves
  // while the user swipes invites it to jump back.
  const initialPreviewIndexRef = useRef(0);
  const activePreviewUrlRef = useRef<string | undefined>(undefined);
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

  useEffect(() => {
    if (isPreviewOpen && activePreviewUrlRef.current !== previewUrl) closePreview();
  }, [isPreviewOpen, previewUrl, closePreview]);

  useEffect(() => {
    const urls = new Set(mediaItems.map((item) => item.url));
    setSelectedMedia((current) => {
      const visible = new Set([...current].filter((url) => urls.has(url)));
      return visible.size === current.size ? current : visible;
    });
  }, [mediaItems]);

  // Stable callback refs to avoid re-renders
  const onItemPressRef = useRef<(url: string) => void>(() => {});
  const onItemLongPressRef = useRef<(url: string) => void>(() => {});

  onItemPressRef.current = (url: string) => {
    if (isDeleting) return;
    if (isSelectionMode) {
      setSelectedMedia((prev) => {
        const next = new Set(prev);
        if (next.has(url)) next.delete(url);
        else next.add(url);
        if (next.size === 0) setIsSelectionMode(false);
        return next;
      });
    } else {
      const index = Math.max(
        mediaItems.findIndex((item) => item.url === url),
        0,
      );
      initialPreviewIndexRef.current = index;
      activePreviewUrlRef.current = url;
      setPreviewIndex(index);
      setIsPreviewOpen(true);
    }
  };

  onItemLongPressRef.current = (url: string) => {
    if (isDeleting) return;
    setIsSelectionMode(true);
    setSelectedMedia(new Set([url]));
  };

  const exitSelectionMode = useCallback(() => {
    setIsSelectionMode(false);
    setSelectedMedia(new Set());
  }, []);

  const confirmDelete = useCallback(async () => {
    if (isDeleting || selectedMedia.size === 0) return;
    try {
      const removed = await deleteItems(selectedMedia);
      if ([...selectedMedia].every((url) => removed.has(url))) {
        exitSelectionMode();
      } else {
        setSelectedMedia((current) => new Set([...current].filter((url) => !removed.has(url))));
        showToast.error('Delete incomplete', 'Some selected items could not be deleted.', insets.top + 8);
      }
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Failed to delete media.';
      showToast.error('Delete failed', message, insets.top + 8);
    } finally {
      setIsDeleteAlertOpen(false);
    }
  }, [deleteItems, exitSelectionMode, isDeleting, selectedMedia, insets.top]);

  const handleShare = useCallback(async () => {
    if (selectedMedia.size === 0) return;
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        showToast.error('Not available', 'Sharing is not supported on this device', insets.top + 8);
        return;
      }
      await withLocalMedia(selectedMedia.values().next().value!, Sharing.shareAsync);
    } catch {
      showToast.error('Share failed', 'Could not share media.', insets.top + 8);
    }
  }, [insets.top, selectedMedia]);

  const handleSave = useCallback(async () => {
    if (selectedMedia.size === 0) return;
    let savedCount = 0;
    try {
      if (Platform.OS !== 'web') {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status !== 'granted') {
          showToast.error('Permission required', 'Please allow access to save media', insets.top + 8);
          return;
        }
      }
      for (const url of selectedMedia) {
        if (Platform.OS === 'web') await downloadMediaOnWeb(url);
        else await withLocalMedia(url, MediaLibrary.saveToLibraryAsync);
        savedCount++;
      }
      showToast.success('Saved', `Saved ${savedCount} item${savedCount === 1 ? '' : 's'}`, insets.top + 8);
      setIsSelectionMode(false);
      setSelectedMedia(new Set());
    } catch {
      showToast.error('Save Failed', 'Failed to save some media', insets.top + 8);
    }
  }, [insets.top, selectedMedia]);

  const handlePreviewScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const index = Math.round(event.nativeEvent.contentOffset.x / screenWidth);
      activePreviewUrlRef.current = mediaItems[index]?.url;
      setPreviewIndex(index);
    },
    [mediaItems, screenWidth],
  );

  const renderPreviewPage = useCallback(
    ({ item, index }: { item: GalleryMedia; index: number }) => (
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
    ({ item, index }: { item: GalleryMedia; index: number }) => (
      <View style={{ flex: 1, padding: GRID_GAP / 2 }}>
        <HistoryItem
          url={item.url}
          thumbnailUrl={item.thumbnailUrl}
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

  const hasSelection = selectedMedia.size > 0;
  const deletesServerFiles = (serverGallery || assetsAvailable !== false) &&
    mediaItems.some((item) => selectedMedia.has(item.url) && item.outputPath);

  const rightElement = useMemo(() => {
    return (
      <HStack className="items-center" space="xs">
        <Button
          variant="link"
          className="h-9 w-9 rounded-xl p-0"
          onPress={handleShare}
          disabled={!isSelectionMode || !hasSelection || isDeleting}
          style={{ opacity: isSelectionMode && hasSelection ? 1 : isSelectionMode ? 0.3 : 0 }}
          pointerEvents={isSelectionMode ? 'auto' : 'none'}
        >
          <Icon as={Share} size="md" className="text-primary-500" />
        </Button>
        <Button
          variant="link"
          className="h-9 w-9 rounded-xl p-0"
          onPress={handleSave}
          disabled={!isSelectionMode || !hasSelection || isDeleting}
          style={{ opacity: isSelectionMode && hasSelection ? 1 : isSelectionMode ? 0.3 : 0 }}
          pointerEvents={isSelectionMode ? 'auto' : 'none'}
        >
          <Icon as={Download} size="md" className="text-primary-500" />
        </Button>
        <Button
          variant="link"
          className="h-9 w-9 rounded-xl p-0"
          onPress={() => setIsDeleteAlertOpen(true)}
          disabled={!isSelectionMode || !hasSelection || isDeleting}
          style={{ opacity: isSelectionMode && hasSelection ? 1 : isSelectionMode ? 0.3 : 0 }}
          pointerEvents={isSelectionMode ? 'auto' : 'none'}
        >
          <Icon as={Trash2} size="md" className="text-error-500" />
        </Button>
        {isSelectionMode ? (
          <Button
            variant="solid"
            size="xs"
            onPress={exitSelectionMode}
            disabled={isDeleting}
            className="ml-1 rounded-lg bg-primary-500"
            style={{ width: 60 }}
          >
            <ButtonText className="text-xs font-semibold">Done</ButtonText>
          </Button>
        ) : (
          <Button
            variant="solid"
            size="xs"
            onPress={() => setIsSelectionMode(true)}
            className="ml-1 rounded-lg bg-background-100"
            style={{ width: 60, borderWidth: 1, borderColor: 'transparent' }}
          >
            <ButtonText className="text-xs font-medium text-primary-400">Select</ButtonText>
          </Button>
        )}
      </HStack>
    );
  }, [isSelectionMode, hasSelection, isDeleting, handleShare, handleSave, exitSelectionMode]);

  return (
    <View className="flex-1 bg-background-0">
      <AppBar
        title={isSelectionMode ? `${selectedMedia.size} selected` : serverGallery ? 'Server Assets' : 'History'}
        titleSize="sm"
        showBack={serverGallery}
        rightElement={rightElement}
      />

      {error && (
        <Text className="px-4 py-2 text-sm text-typography-500">{error}</Text>
      )}
      {/* Grid */}
      <FlatList
        data={mediaItems}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        numColumns={NUM_COLUMNS}
        removeClippedSubviews
        contentContainerStyle={listContentStyle}
        initialNumToRender={12}
        maxToRenderPerBatch={9}
        windowSize={5}
        refreshing={refreshing}
        onRefresh={refresh}
        ListEmptyComponent={serverGallery && !refreshing && !error ? (
          <Text className="px-4 py-8 text-center text-typography-500">No images or videos on this server yet.</Text>
        ) : null}
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
            transition={{ type: 'timing', duration: 140 }}
            exitTransition={{ type: 'timing', duration: 110, delay: 120 }}
            style={[StyleSheet.absoluteFill, { zIndex: 20, backgroundColor: 'black' }]}
          >
            <MotiView
              from={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              transition={{ type: 'timing', duration: 200 }}
              exitTransition={{ type: 'timing', duration: 120 }}
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
                initialScrollIndex={initialPreviewIndexRef.current}
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
                  className="min-w-[52px] items-center rounded-full bg-black/40 px-2.5 py-1.5"
                >
                  <Text className="text-xs font-medium text-white">
                    {previewIndex + 1}/{mediaItems.length}
                  </Text>
                </View>
              )}

              <TouchableOpacity
                activeOpacity={0.5}
                onPress={closePreview}
                style={{
                  position: 'absolute',
                  top: insets.top + 12,
                  right: 12,
                  backgroundColor: 'rgba(0,0,0,0.3)',
                  borderRadius: 8,
                  padding: 8,
                  zIndex: 30,
                }}
              >
                <Icon as={X} size="sm" className="text-white" />
              </TouchableOpacity>
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
        isOpen={isDeleteAlertOpen && hasSelection}
        onClose={() => {
          if (!isDeleting) setIsDeleteAlertOpen(false);
        }}
        onConfirm={confirmDelete}
        title={selectedMedia.size > 1 ? 'Delete Selected Media' : 'Delete Media'}
        description={deletesServerFiles
          ? 'This permanently deletes the linked files from the ComfyUI server and removes the selected items from this gallery.'
          : 'This permanently removes the selected items from this workflow history.'}
      />
    </View>
  );
}

const keyExtractor = (item: { url: string }) => item.url;
