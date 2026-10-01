import { ConfirmDialog } from '@/components/self-ui/confirm-dialog';
import { Action, Copy, DesignColorProvider, useDesign } from '@/components/ui/design-system/primitives';
import { designColors, designTokens as t } from '@/constants/design-tokens';
import { Download, ImageIcon, Share, Trash2, X, type LucideIcon } from '@/constants/icons';
import { AppToast } from '@/utils/toast';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { memo, useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
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
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { knownAspect, rememberAspect } from './media-aspect';
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
import {
  fitRect,
  isRectVisible,
  lerpRect,
  measureInWindow,
  offsetRect,
  type Rect,
  type Size,
} from './transition-geometry';
import { useMediaViewerActions } from './use-media-viewer-actions';
import { ViewerOverflowMenu, type OverflowEntry } from './viewer-overflow-menu';

export { toViewerItem, type MediaViewerItem } from './media-viewer-utils';
export type { Rect } from './transition-geometry';

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
/** Without a tile to fly to, the media grows from (and shrinks to) this scale as it fades. */
const FALLBACK_SCALE = 0.92;
/** The bar fades in over the last part of the opening, and is gone early in the closing. */
const BAR_FROM = 0.6;
/** How long an opening waits for its stand-in image to decode before flying anyway (ms). */
const FLIGHT_IMAGE_WAIT = 150;
/** How long the stand-in waits, after landing, for the real page to draw (ms). */
const PAGE_WAIT = 400;
const ENTER_EASING = Easing.bezier(...t.easing.enter);
const EXIT_EASING = Easing.bezier(...t.easing.exit);
const EMPTY_RECT: Rect = { x: 0, y: 0, width: 0, height: 0 };

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
   * Where an item's grid tile is on screen, in window coordinates, or nothing
   * when it is not visible (see `useMediaTileRects`). With it the viewer grows
   * out of the tapped tile and shrinks back into the current item's tile;
   * without it, or for a tile out of view, it fades and scales instead.
   */
  getOriginRect?: (item: MediaViewerItem) => Promise<Rect | undefined>;
  /**
   * Deletes the item and drops it from `items`. The viewer asks for
   * confirmation first, then shows the next item, or closes when none remain.
   * Without it there is no Delete action.
   */
  onDelete?: (item: MediaViewerItem) => Promise<void> | void;
}

/** Full-screen image and video viewer shared by the Gallery tab, History and run results. */
export function MediaViewer({ visible, onClose, presentation = 'modal', ...props }: MediaViewerProps) {
  // Every way out (X, tap, swipe, back) runs the exit transition before `onClose`.
  const closeRef = useRef<() => void>(undefined);
  const requestClose = useCallback(() => (closeRef.current ? closeRef.current() : onClose()), [onClose]);
  if (presentation === 'overlay') {
    if (!visible) return null;
    return (
      <View style={styles.overlay}>
        <ViewerBody {...props} onClose={onClose} closeRef={closeRef} handleBack />
      </View>
    );
  }
  return (
    <Modal
      visible={visible}
      // Transparent so a swipe reveals the screen it will return to; the viewer
      // paints its own black backdrop and runs its own open and close transitions.
      transparent
      animationType="none"
      onRequestClose={requestClose}
      statusBarTranslucent
      navigationBarTranslucent
      supportedOrientations={['portrait', 'landscape']}
    >
      <StatusBar style="light" />
      {visible && <ViewerBody {...props} onClose={onClose} closeRef={closeRef} />}
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

type ViewerContentProps = Omit<MediaViewerProps, 'visible' | 'presentation'> & {
  /** Receives the animated close, for the presentation's own back handling. */
  closeRef: RefObject<(() => void) | undefined>;
  handleBack?: boolean;
};

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
  getOriginRect,
  onDelete,
  closeRef,
  handleBack,
}: ViewerContentProps) {
  const c = useDesign();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  // Media flies between its tile and the screen only where it can be measured
  // and motion is welcome; everywhere else the viewer fades and scales.
  const canFly = Platform.OS !== 'web' && !reduceMotion;
  const rootRef = useRef<View>(null);
  const listRef = useRef<FlatList<MediaViewerItem>>(null);
  const [size, setSize] = useState<Size>();
  const [openingIndex] = useState(() => clampIndex(initialIndex, items.length));
  const [rawIndex, setRawIndex] = useState(openingIndex);
  const [zoomed, setZoomed] = useState(false);
  const [closing, setClosing] = useState(false);
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

  useEffect(() => {
    onIndexChange?.(index);
  }, [index, onIndexChange]);

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

  // Open and close transitions. `presence` runs 0 (closed) → 1 (open). In a
  // flight a stand-in image moves between the tile's rect and the media's
  // fitted rect while the pager stays hidden; `handoff` then swaps in the
  // interactive pager once its page has drawn the same pixels in the same
  // place. Otherwise the pager itself fades and scales.
  const presence = useSharedValue(0);
  const flying = useSharedValue(false);
  const handoff = useSharedValue(0);
  const fromRect = useSharedValue<Rect>(EMPTY_RECT);
  const toRect = useSharedValue<Rect>(EMPTY_RECT);
  const restScale = useSharedValue(FALLBACK_SCALE);
  const dragY = useSharedValue(0);
  const dismissing = useSharedValue(false);
  const phase = useRef<'opening' | 'open' | 'closing'>('opening');

  // The stand-in always holds the current image, so it is decoded before a close needs it.
  const flightUri = canFly && current?.kind === 'image' ? current.uri : undefined;
  const flightShown = useRef<string>(undefined);
  const flightWaiter = useRef<() => void>(undefined);
  const onFlightDisplay = useCallback((uri: string) => {
    flightShown.current = uri;
    flightWaiter.current?.();
  }, []);
  const untilFlightShown = (uri: string) =>
    new Promise<void>((resolve) => {
      if (flightShown.current === uri) return resolve();
      const timer = setTimeout(resolve, FLIGHT_IMAGE_WAIT);
      flightWaiter.current = () => {
        clearTimeout(timer);
        flightWaiter.current = undefined;
        resolve();
      };
    });

  // The grid tile of `item` in the viewer's own coordinates, which differ from
  // the window's for an overlay inside a sheet.
  const tileRect = async (item: MediaViewerItem | undefined, bounds: Size) => {
    const root = rootRef.current;
    if (!canFly || !getOriginRect || !root || item?.kind !== 'image') return undefined;
    const [tile, own] = await Promise.all([getOriginRect(item), measureInWindow(root)]);
    if (!tile || !own) return undefined;
    const local = offsetRect(tile, -own.x, -own.y);
    return isRectVisible(local, { x: 0, y: 0, ...bounds }) ? local : undefined;
  };

  const opened = useRef(false);
  const openingPageShown = useRef(false);
  const showPager = useCallback(() => {
    if (phase.current !== 'closing') handoff.set(1);
  }, [handoff]);
  const onOpened = useCallback(() => {
    if (phase.current !== 'opening') return;
    phase.current = 'open';
    opened.current = true;
    if (openingPageShown.current) showPager();
    // A page that never reports (a failed load) must not leave the stand-in in charge.
    else setTimeout(showPager, PAGE_WAIT);
  }, [showPager]);
  const openingUri = items[openingIndex]?.uri;
  const onPageDisplay = useCallback(
    (uri: string) => {
      if (uri !== openingUri || openingPageShown.current) return;
      openingPageShown.current = true;
      if (opened.current) showPager();
    },
    [openingUri, showPager],
  );

  const started = useRef(false);
  useEffect(() => {
    if (!size || started.current) return;
    started.current = true;
    const item = items[openingIndex];
    void (async () => {
      const tile = await tileRect(item, size);
      if (phase.current !== 'opening') return;
      if (tile && item) {
        fromRect.set(tile);
        // Without a known shape, aim for the tile's; the stand-in's load corrects it mid-flight.
        toRect.set(fitRect(knownAspect(item.uri) ?? tile.width / tile.height, size));
        handoff.set(0);
        flying.set(true);
        await untilFlightShown(item.uri);
        if (phase.current !== 'opening') return;
        presence.set(withTiming(1, { duration: t.motion.enter, easing: ENTER_EASING }, () => scheduleOnRN(onOpened)));
      } else {
        handoff.set(1);
        restScale.set(reduceMotion ? 1 : FALLBACK_SCALE);
        const duration = reduceMotion ? t.motion.fast : t.motion.enter;
        presence.set(withTiming(1, { duration, easing: ENTER_EASING }, () => scheduleOnRN(onOpened)));
      }
    })();
    // Runs once, when the viewer first has a size.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size]);

  const onFlightLoad = useCallback(
    (uri: string, aspect: number) => {
      if (phase.current === 'opening' && size && uri === openingUri) toRect.set(fitRect(aspect, size));
    },
    [size, openingUri, toRect],
  );

  // What the close reads must be current, while the callback itself stays
  // stable for the gesture and the back handlers.
  const latest = useRef({ items, index, zoomed, size, onClose, tileRect });
  useEffect(() => {
    latest.current = { items, index, zoomed, size, onClose, tileRect };
  });
  const requestClose = useCallback(
    async (fromSwipe: boolean) => {
      if (phase.current === 'closing') return;
      phase.current = 'closing';
      // Pauses the video on screen, so no audio outlives the viewer.
      setClosing(true);
      const {
        items: list,
        index: at,
        zoomed: isZoomed,
        size: bounds,
        onClose: done,
        tileRect: findTile,
      } = latest.current;
      const item = list[at];
      const finish = () => done();
      const aspect = item ? knownAspect(item.uri) : undefined;
      // A zoomed image, or a stand-in not yet decoded, would jump; those fade instead.
      const tile =
        item && bounds && aspect && !isZoomed && flightShown.current === item.uri
          ? await findTile(item, bounds)
          : undefined;
      if (tile && bounds && aspect) {
        fromRect.set(tile);
        // A swipe has already carried the media up by `dragY`.
        toRect.set(offsetRect(fitRect(aspect, bounds), 0, dragY.get()));
        flying.set(true);
        handoff.set(0);
        presence.set(withTiming(0, { duration: t.motion.exit, easing: EXIT_EASING }, () => scheduleOnRN(finish)));
        return;
      }
      flying.set(false);
      handoff.set(1);
      // A swipe keeps travelling upward rather than shrinking in place.
      restScale.set(reduceMotion || fromSwipe ? 1 : FALLBACK_SCALE);
      const duration = reduceMotion ? t.motion.fast : t.motion.exit;
      if (fromSwipe && !reduceMotion && bounds) {
        dragY.set(withTiming(-bounds.height, { duration, easing: EXIT_EASING }));
      }
      presence.set(withTiming(0, { duration, easing: EXIT_EASING }, () => scheduleOnRN(finish)));
    },
    [reduceMotion, fromRect, toRect, flying, handoff, presence, restScale, dragY],
  );
  const close = useCallback(() => void requestClose(false), [requestClose]);
  // A released swipe arrives from the UI thread as state, then closes like the rest.
  const [swiped, setSwiped] = useState(false);
  useEffect(() => {
    if (swiped) void requestClose(true);
  }, [swiped, requestClose]);

  useEffect(() => {
    closeRef.current = close;
    return () => {
      closeRef.current = undefined;
    };
  }, [close, closeRef]);

  useEffect(() => {
    if (items.length === 0) close();
  }, [items.length, close]);

  // An in-tree overlay does not get Android's back gesture for free.
  useEffect(() => {
    if (!handleBack) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      close();
      return true;
    });
    return () => subscription.remove();
  }, [handleBack, close]);

  const renderItem = useCallback(
    ({ item, index: itemIndex }: { item: MediaViewerItem; index: number }) => {
      if (!size) return null;
      return item.kind === 'video' ? (
        // Laid out below the bar, so the bar never covers the native controls.
        <VideoPage
          uri={item.uri}
          width={size.width}
          height={size.height}
          active={itemIndex === index && !closing}
          insetTop={barHeight}
          insetBottom={insets.bottom}
        />
      ) : (
        <ImagePage
          uri={item.uri}
          width={size.width}
          height={size.height}
          active={itemIndex === index}
          onTap={close}
          onZoomChange={setZoomed}
          onDisplay={onPageDisplay}
        />
      );
    },
    [size, index, closing, barHeight, insets.bottom, close, onPageDisplay],
  );

  // Swipe up to dismiss: the media follows the finger while the backdrop and
  // chrome thin out; on release it either leaves through the close transition
  // or settles back. Horizontal drags fail it and stay with the pager; a zoomed
  // image keeps its pan.
  const settleDuration = reduceMotion ? 0 : t.motion.fast;
  const dismissGesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(!zoomed && height > 0)
        .maxPointers(1)
        .activeOffsetY(t.layout.inset)
        .failOffsetX([-t.layout.field, t.layout.field])
        .onUpdate((event) => {
          if (!dismissing.get()) dragY.set(Math.min(event.translationY, 0));
        })
        .onEnd((event) => {
          if (dismissing.get()) return;
          if (shouldDismiss(event.translationY, event.velocityY, height)) {
            dismissing.set(true);
            scheduleOnRN(setSwiped, true);
          } else {
            dragY.set(withTiming(0, { duration: settleDuration }));
          }
        }),
    [zoomed, height, settleDuration, dragY, dismissing],
  );
  const progress = useDerivedValue(() => dismissProgress(dragY.get(), height));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.get(), [0, 1], [1, DRAG_BACKDROP]) * presence.get(),
  }));
  const mediaStyle = useAnimatedStyle(() => {
    if (flying.get()) return { opacity: handoff.get(), transform: [{ translateY: dragY.get() }, { scale: 1 }] };
    const shown = presence.get();
    return {
      opacity: shown,
      transform: [{ translateY: dragY.get() }, { scale: interpolate(shown, [0, 1], [restScale.get(), 1]) }],
    };
  });
  const flightStyle = useAnimatedStyle(() => {
    const shown = presence.get();
    const rect = lerpRect(fromRect.get(), toRect.get(), shown);
    return {
      opacity: flying.get() ? 1 - handoff.get() : 0,
      left: rect.x,
      top: rect.y,
      width: rect.width,
      height: rect.height,
      // From the tile's rounded corners to the viewer's square edges.
      borderRadius: interpolate(shown, [0, 1], [t.radius.control, 0]),
    };
  });
  // The bar arrives as the media lands, and leaves first.
  const chromeStyle = useAnimatedStyle(() => ({
    opacity: (1 - progress.get()) * interpolate(presence.get(), [BAR_FROM, 1], [0, 1], Extrapolation.CLAMP),
  }));

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
      ref={rootRef}
      // Measured in the window to place the tile it opens from and closes into.
      collapsable={false}
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

      {flightUri && (
        <Animated.View pointerEvents="none" style={[styles.flight, flightStyle]}>
          <FlightImage uri={flightUri} onDisplay={onFlightDisplay} onLoad={onFlightLoad} />
        </Animated.View>
      )}

      {/* The only chrome: one bar over the top of the media, on a flat scrim.
        Close and the position on the left, the actions on the right. */}
      <Animated.View style={[styles.bar, chromeStyle]}>
        <View
          className="bg-media/50"
          onLayout={(event) => setBarHeight(event.nativeEvent.layout.height)}
          style={[
            styles.barSurface,
            {
              paddingTop: insets.top,
              paddingLeft: insets.left + t.layout.gutter - GLYPH_SLACK,
              paddingRight: insets.right + t.layout.gutter - GLYPH_SLACK,
            },
          ]}
        >
          <Action kind="text" icon={X} iconSize={t.icon.large} label="Close viewer" onPress={close} />
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

/**
 * The stand-in that flies between a tile and the screen. `cover` crops it like
 * the tile at the start and, once its frame has the media's own shape, shows
 * the whole image exactly as the page does.
 */
const FlightImage = memo(function FlightImage({
  uri,
  onDisplay,
  onLoad,
}: {
  uri: string;
  onDisplay: (uri: string) => void;
  onLoad: (uri: string, aspect: number) => void;
}) {
  return (
    <Image
      source={{ uri }}
      style={StyleSheet.absoluteFill}
      contentFit="cover"
      cachePolicy="memory-disk"
      recyclingKey={uri}
      accessibilityIgnoresInvertColors
      onDisplay={() => onDisplay(uri)}
      onLoad={(event) => {
        const { width, height } = event.source;
        rememberAspect(uri, width, height);
        if (width > 0 && height > 0) onLoad(uri, width / height);
      }}
    />
  );
});

const keyExtractor = (item: MediaViewerItem, index: number) => `${item.uri}-${index}`;

const styles = StyleSheet.create({
  fill: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFill, zIndex: 20 },
  flight: { position: 'absolute', overflow: 'hidden' },
  bar: { position: 'absolute', top: 0, left: 0, right: 0, pointerEvents: 'box-none' },
  barSurface: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: t.height.touch,
  },
  counter: { flex: 1, minWidth: 0, paddingLeft: t.layout.label },
});
