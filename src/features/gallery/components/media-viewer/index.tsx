import { ConfirmDialog } from '@/components/self-ui/confirm-dialog';
import { Action, Copy, DesignColorProvider, useDesign } from '@/components/ui/design-system/primitives';
import { designColors, designTokens as t } from '@/constants/design-tokens';
import { Download, ImageIcon, Share, Trash2, X, type LucideIcon } from '@/constants/icons';
import { AppToast } from '@/utils/toast';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BackHandler,
  Modal,
  Platform,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { FlatList, Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  FadeIn,
  interpolate,
  useAnimatedStyle,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { ImagePage, VideoPage } from './media-viewer-page';
import {
  clampIndex,
  dismissProgress,
  formatCounter,
  getViewerActions,
  indexAfterDelete,
  pageFromOffset,
  shouldDismiss,
  type MediaViewerBarAction,
  type MediaViewerItem,
} from './media-viewer-utils';
import { useMediaViewerActions } from './use-media-viewer-actions';
import { ViewerOverflowMenu, type OverflowEntry } from './viewer-overflow-menu';

export { toViewerItem, type MediaViewerItem } from './media-viewer-utils';

/** The viewer is always on black, whatever the app theme. */
const chrome = designColors.dark;
/**
 * A 44-point target around a 20-point glyph leaves 12 points of slack. The
 * bar's edges subtract it so the painted glyph, not the invisible target, sits
 * on the gutter.
 */
const GLYPH_SLACK = (t.height.touch - t.icon.large) / 2;
/** The backdrop thins to this while dragging down, so the screen beneath shows through. */
const DRAG_BACKDROP = 0.35;

interface MediaViewerProps {
  items: MediaViewerItem[];
  /** Where the viewer opens; read when it becomes visible. */
  initialIndex: number;
  visible: boolean;
  onClose: () => void;
  onIndexChange?: (index: number) => void;
  /**
   * `modal` covers the app with a native modal. `overlay` fills the nearest
   * full-size ancestor instead, for screens that are themselves native form
   * sheets: a modal nested in one hosts its own view hierarchy, where the video
   * layer never renders — sound over a black screen.
   */
  presentation?: 'modal' | 'overlay';
  /** With both set, images can become the workflow's thumbnail. */
  workflowId?: string;
  serverId?: string;
  /**
   * Deletes the item and drops it from `items`. The viewer asks for
   * confirmation first, then shows the next item, or closes when none remain.
   * Without it there is no Delete action.
   */
  onDelete?: (item: MediaViewerItem) => Promise<void> | void;
}

/** Full-screen image and video viewer shared by the Gallery tab, History and run results. */
export function MediaViewer({ visible, onClose, presentation = 'modal', ...props }: MediaViewerProps) {
  const reduceMotion = useReducedMotion();
  if (presentation === 'overlay') {
    if (!visible) return null;
    // No exit fade: dissolving full-screen media into the grid behind it, which
    // shows a thumbnail of the same media, reads as a ghost of the image.
    return (
      <Animated.View entering={FadeIn.duration(t.motion.base)} style={styles.overlay}>
        <ViewerBody {...props} onClose={onClose} handleBack />
      </Animated.View>
    );
  }
  return (
    <Modal
      visible={visible}
      // Transparent so a downward drag reveals the screen it will return to;
      // the viewer paints its own black backdrop.
      transparent
      animationType={reduceMotion ? 'none' : 'fade'}
      onRequestClose={onClose}
      statusBarTranslucent
      navigationBarTranslucent
      supportedOrientations={['portrait', 'landscape']}
    >
      <StatusBar style="light" />
      {visible && <ViewerBody {...props} onClose={onClose} />}
    </Modal>
  );
}

const BAR_META: Record<MediaViewerBarAction, { icon: LucideIcon; label: string }> = {
  save: { icon: Download, label: Platform.OS === 'web' ? 'Download' : 'Save to Photos' },
  share: { icon: Share, label: 'Share' },
  delete: { icon: Trash2, label: 'Delete' },
};
const MENU_ENTRIES: OverflowEntry<'thumbnail'>[] = [
  { key: 'thumbnail', icon: ImageIcon, label: 'Set as workflow thumbnail' },
];

type ViewerContentProps = Omit<MediaViewerProps, 'visible' | 'presentation'> & { handleBack?: boolean };

function ViewerBody(props: ViewerContentProps) {
  return (
    // A modal is its own native root; gestures, safe-area insets and the
    // delete confirmation's sheet stack must be re-rooted inside it.
    <GestureHandlerRootView style={styles.fill}>
      <SafeAreaProvider style={styles.fill}>
        <DesignColorProvider value={chrome}>
          <BottomSheetModalProvider>
            <ViewerContent {...props} />
            <AppToast />
          </BottomSheetModalProvider>
        </DesignColorProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function ViewerContent({
  items,
  initialIndex,
  onClose,
  onIndexChange,
  workflowId,
  serverId,
  onDelete,
  handleBack,
}: ViewerContentProps) {
  const c = useDesign();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const listRef = useRef<FlatList<MediaViewerItem>>(null);
  const [size, setSize] = useState<{ width: number; height: number }>();
  const [openingIndex] = useState(() => clampIndex(initialIndex, items.length));
  const [rawIndex, setRawIndex] = useState(openingIndex);
  const [chromeHidden, setChromeHidden] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const [barHeight, setBarHeight] = useState(0);
  const [pendingDelete, setPendingDelete] = useState<MediaViewerItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string>();
  const actions = useMediaViewerActions({ workflowId, serverId });

  // A deletion can leave the index past the end; clamping keeps it on the item
  // that slid into place.
  const index = clampIndex(rawIndex, items.length);
  const current = items[index];
  // Native video controls own taps on a video, so its chrome stays up.
  const chromeShown = !chromeHidden || current?.kind === 'video';

  useEffect(() => {
    if (items.length === 0) onClose();
  }, [items.length, onClose]);

  useEffect(() => {
    onIndexChange?.(index);
  }, [index, onIndexChange]);

  // An in-tree overlay does not get Android's back gesture for free.
  useEffect(() => {
    if (!handleBack) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => subscription.remove();
  }, [handleBack, onClose]);

  // Rotation changes the page width, and a deletion the list under the pager;
  // either way the same item stays on screen.
  const width = size?.width ?? 0;
  const height = size?.height ?? 0;
  const indexRef = useRef(index);
  useEffect(() => {
    indexRef.current = index;
  }, [index]);
  useEffect(() => {
    if (width > 0) listRef.current?.scrollToOffset({ offset: indexRef.current * width, animated: false });
  }, [width, items.length]);

  const updateIndex = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      setRawIndex(pageFromOffset(event.nativeEvent.contentOffset.x, width, items.length));
    },
    [items.length, width],
  );

  const toggleChrome = useCallback(() => setChromeHidden((hidden) => !hidden), []);

  const renderItem = useCallback(
    ({ item, index: itemIndex }: { item: MediaViewerItem; index: number }) => {
      if (!size) return null;
      return item.kind === 'video' ? (
        // Laid out below the bar, so the bar never covers the native controls.
        <VideoPage
          uri={item.uri}
          width={size.width}
          height={size.height}
          active={itemIndex === index}
          insetTop={barHeight}
          insetBottom={insets.bottom}
        />
      ) : (
        <ImagePage
          uri={item.uri}
          width={size.width}
          height={size.height}
          active={itemIndex === index}
          onTap={toggleChrome}
          onZoomChange={setZoomed}
        />
      );
    },
    [size, index, barHeight, insets.bottom, toggleChrome],
  );

  // Swipe down to dismiss: the media follows the finger while the backdrop and
  // chrome thin out; on release it either leaves downwards or settles back.
  // Horizontal drags fail it and stay with the pager; a zoomed image keeps its pan.
  const dragY = useSharedValue(0);
  const dismissing = useSharedValue(false);
  const duration = reduceMotion ? 0 : t.motion.fast;
  const dismissGesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(!zoomed && height > 0)
        .maxPointers(1)
        .activeOffsetY(t.layout.inset)
        .failOffsetX([-t.layout.field, t.layout.field])
        .onUpdate((event) => {
          if (!dismissing.get()) dragY.set(Math.max(event.translationY, 0));
        })
        .onEnd((event) => {
          if (shouldDismiss(event.translationY, event.velocityY, height)) {
            dismissing.set(true);
            dragY.set(withTiming(height, { duration }, () => scheduleOnRN(onClose)));
          } else {
            dragY.set(withTiming(0, { duration }));
          }
        }),
    [zoomed, height, duration, dragY, dismissing, onClose],
  );
  const progress = useDerivedValue(() => dismissProgress(dragY.get(), height));
  const chromeOpacity = useSharedValue(1);
  useEffect(() => {
    chromeOpacity.set(withTiming(chromeShown ? 1 : 0, { duration }));
  }, [chromeShown, duration, chromeOpacity]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.get(), [0, 1], [1, DRAG_BACKDROP]),
  }));
  const mediaStyle = useAnimatedStyle(() => ({ transform: [{ translateY: dragY.get() }] }));
  const chromeStyle = useAnimatedStyle(() => ({
    opacity: chromeOpacity.get() * (1 - progress.get()),
  }));

  // Set on the plain inner view: web does not reliably re-apply non-animated
  // style changes on an Animated.View.
  const chromePointerEvents = { pointerEvents: chromeShown ? 'auto' : 'none' } as const;
  const counter = formatCounter(index, items.length);
  const available = getViewerActions({
    canShare: actions.canShare,
    canSetThumbnail: actions.canSetThumbnail,
    canDelete: !!onDelete,
    kind: current?.kind,
  });
  const menuEntries = MENU_ENTRIES.filter((entry) => available.menu.includes(entry.key));

  const runAction = (action: MediaViewerBarAction) => {
    if (!current) return;
    if (action === 'save') void actions.save(current);
    else if (action === 'share') void actions.share(current);
    else {
      setDeleteError(undefined);
      setPendingDelete(current);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete || !onDelete) return;
    const deletedIndex = items.findIndex((item) => item.uri === pendingDelete.uri);
    setDeleting(true);
    try {
      await onDelete(pendingDelete);
      // With nothing left, the emptied list closes the viewer.
      const next = indexAfterDelete(deletedIndex, items.length - 1);
      if (next >= 0) setRawIndex(next);
      setPendingDelete(null);
    } catch (error) {
      console.error('Failed to delete media:', error);
      setDeleteError('It could not be deleted. Try again.');
    } finally {
      setDeleting(false);
    }
  };
  const noun = pendingDelete?.kind === 'video' ? 'video' : 'image';

  return (
    <View
      style={styles.fill}
      onLayout={(event) => {
        const { width: w, height: h } = event.nativeEvent.layout;
        setSize((prev) => (prev?.width === w && prev?.height === h ? prev : { width: w, height: h }));
      }}
    >
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: c.media }, backdropStyle]} />

      {size && (
        <GestureDetector gesture={dismissGesture}>
          <Animated.View style={[styles.fill, mediaStyle]}>
            <FlatList
              ref={listRef}
              data={items}
              horizontal
              pagingEnabled
              scrollEnabled={!zoomed}
              showsHorizontalScrollIndicator={false}
              keyExtractor={keyExtractor}
              initialScrollIndex={openingIndex}
              getItemLayout={(_, itemIndex) => ({
                length: size.width,
                offset: size.width * itemIndex,
                index: itemIndex,
              })}
              // Web has no momentum events; the settled scroll position is enough there.
              onMomentumScrollEnd={Platform.OS === 'web' ? undefined : updateIndex}
              onScroll={Platform.OS === 'web' ? updateIndex : undefined}
              scrollEventThrottle={Platform.OS === 'web' ? 100 : undefined}
              extraData={renderItem}
              // A gallery can hold hundreds of items; keep only the neighbours alive.
              initialNumToRender={1}
              maxToRenderPerBatch={2}
              windowSize={3}
              renderItem={renderItem}
            />
          </Animated.View>
        </GestureDetector>
      )}

      {/* The only chrome: one bar over the top of the media, on a flat scrim.
        Close and the position on the left, the actions on the right. */}
      <Animated.View style={[styles.bar, chromeStyle]}>
        <View
          className="bg-media/50"
          onLayout={(event) => setBarHeight(event.nativeEvent.layout.height)}
          style={[
            styles.barSurface,
            chromePointerEvents,
            {
              borderBottomColor: c.line,
              paddingTop: insets.top,
              paddingLeft: insets.left + t.layout.gutter - GLYPH_SLACK,
              paddingRight: insets.right + t.layout.gutter - GLYPH_SLACK,
            },
          ]}
        >
          <Action kind="text" icon={X} iconSize={t.icon.large} label="Close viewer" onPress={onClose} />
          <View style={styles.counter}>
            {counter && (
              <Copy mono muted size="metadata" numberOfLines={1} accessibilityLabel={`${index + 1} of ${items.length}`}>
                {counter}
              </Copy>
            )}
          </View>
          {available.bar.map((action) => (
            <Action
              key={action}
              kind="text"
              icon={BAR_META[action].icon}
              iconSize={t.icon.large}
              label={BAR_META[action].label}
              destructive={action === 'delete'}
              loading={actions.busy === action}
              disabled={actions.busy !== null && actions.busy !== action}
              onPress={() => runAction(action)}
            />
          ))}
          {menuEntries.length > 0 && (
            <ViewerOverflowMenu
              entries={menuEntries}
              disabled={actions.busy !== null}
              onSelect={() => {
                if (current) void actions.setThumbnail(current);
              }}
            />
          )}
        </View>
      </Animated.View>

      <ConfirmDialog
        isOpen={pendingDelete !== null}
        destructive
        loading={deleting}
        error={deleteError}
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
        title={`Delete this ${noun}?`}
        description={`The ${noun} is removed from Comfy Portal. This cannot be undone.`}
        confirmText="Delete"
      />
    </View>
  );
}

const keyExtractor = (item: MediaViewerItem, index: number) => `${item.uri}-${index}`;

const styles = StyleSheet.create({
  fill: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFill, zIndex: 20 },
  bar: { position: 'absolute', top: 0, left: 0, right: 0, pointerEvents: 'box-none' },
  barSurface: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: t.height.touch,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  counter: { flex: 1, minWidth: 0, paddingLeft: t.layout.label },
});
