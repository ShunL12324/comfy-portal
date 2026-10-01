import { Action, Copy, DesignColorProvider, useDesign } from '@/components/ui/design-system/primitives';
import { designColors, designTokens as t } from '@/constants/design-tokens';
import { Download, ImageIcon, Share, Trash2, X, type LucideIcon } from '@/constants/icons';
import { AppToast } from '@/utils/toast';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  BackHandler,
  Modal,
  Platform,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { FlatList, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { FadeIn, useAnimatedStyle, useReducedMotion, withTiming } from 'react-native-reanimated';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ImagePage, VideoPage } from './media-viewer-page';
import {
  clampIndex,
  formatCounter,
  getViewerActions,
  pageFromOffset,
  type MediaViewerAction,
  type MediaViewerItem,
} from './media-viewer-utils';
import { useMediaViewerActions } from './use-media-viewer-actions';

export { toViewerItem, type MediaViewerItem } from './media-viewer-utils';

/** The viewer is always on black, whatever the app theme. */
const chrome = designColors.dark;
const BAR_PADDING = t.layout.related;

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
  /** Offered only where the opening screen already supports deleting. */
  onDelete?: (item: MediaViewerItem) => void;
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

const ACTION_META: Record<MediaViewerAction, { icon: LucideIcon; label: string }> = {
  save: { icon: Download, label: Platform.OS === 'web' ? 'Download' : 'Save to Photos' },
  share: { icon: Share, label: 'Share' },
  thumbnail: { icon: ImageIcon, label: 'Set as workflow thumbnail' },
  delete: { icon: Trash2, label: 'Delete' },
};

function ViewerBody(props: Omit<MediaViewerProps, 'visible' | 'presentation'> & { handleBack?: boolean }) {
  return (
    // A modal is its own native root; gestures and safe-area insets must be re-rooted inside it.
    <GestureHandlerRootView style={styles.fill}>
      <SafeAreaProvider style={styles.fill}>
        <DesignColorProvider value={chrome}>
          <ViewerContent {...props} />
          <AppToast />
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
}: Omit<MediaViewerProps, 'visible' | 'presentation'> & { handleBack?: boolean }) {
  const c = useDesign();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const listRef = useRef<FlatList<MediaViewerItem>>(null);
  const [size, setSize] = useState<{ width: number; height: number }>();
  const [openingIndex] = useState(() => clampIndex(initialIndex, items.length));
  const [rawIndex, setRawIndex] = useState(openingIndex);
  const [chromeHidden, setChromeHidden] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const actions = useMediaViewerActions({ workflowId, serverId });

  // Deleting the last item leaves the index past the end; clamping keeps it on
  // the item that slid into place.
  const index = clampIndex(rawIndex, items.length);
  const current = items[index];
  // Native video controls own taps on a video, so its bars stay up.
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

  // Rotation changes the page width; keep the same item on screen.
  const width = size?.width ?? 0;
  const indexRef = useRef(index);
  useEffect(() => {
    indexRef.current = index;
  }, [index]);
  useEffect(() => {
    if (width > 0) listRef.current?.scrollToOffset({ offset: indexRef.current * width, animated: false });
  }, [width]);

  const updateIndex = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      setRawIndex(pageFromOffset(event.nativeEvent.contentOffset.x, width, items.length));
    },
    [items.length, width],
  );

  const toggleChrome = useCallback(() => setChromeHidden((hidden) => !hidden), []);

  const topBarHeight = insets.top + BAR_PADDING * 2 + t.height.touch;
  const bottomBarHeight = insets.bottom + BAR_PADDING * 2 + t.height.touch;

  const renderItem = useCallback(
    ({ item, index: itemIndex }: { item: MediaViewerItem; index: number }) => {
      if (!size) return null;
      return item.kind === 'video' ? (
        <VideoPage
          uri={item.uri}
          width={size.width}
          height={size.height}
          active={itemIndex === index}
          insetTop={topBarHeight}
          insetBottom={bottomBarHeight}
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
    [size, index, topBarHeight, bottomBarHeight, toggleChrome],
  );

  const chromeStyle = useAnimatedStyle(
    () => ({ opacity: withTiming(chromeShown ? 1 : 0, { duration: reduceMotion ? 0 : t.motion.fast }) }),
    [chromeShown, reduceMotion],
  );

  // Set on the plain inner views: web does not reliably re-apply non-animated
  // style changes on an Animated.View.
  const barPointerEvents = { pointerEvents: chromeShown ? 'auto' : 'none' } as const;
  const counter = formatCounter(index, items.length);
  const visibleActions = getViewerActions({
    canShare: actions.canShare,
    canSetThumbnail: actions.canSetThumbnail,
    canDelete: !!onDelete,
    kind: current?.kind,
  });

  const runAction = (action: MediaViewerAction) => {
    if (!current) return;
    if (action === 'save') void actions.save(current);
    else if (action === 'share') void actions.share(current);
    else if (action === 'thumbnail') void actions.setThumbnail(current);
    else onDelete?.(current);
  };

  return (
    <View
      style={[styles.fill, { backgroundColor: c.media }]}
      onLayout={(event) => {
        const { width: w, height: h } = event.nativeEvent.layout;
        setSize((prev) => (prev?.width === w && prev?.height === h ? prev : { width: w, height: h }));
      }}
    >
      {size && (
        <FlatList
          ref={listRef}
          data={items}
          horizontal
          pagingEnabled
          scrollEnabled={!zoomed}
          showsHorizontalScrollIndicator={false}
          keyExtractor={keyExtractor}
          initialScrollIndex={openingIndex}
          getItemLayout={(_, itemIndex) => ({ length: size.width, offset: size.width * itemIndex, index: itemIndex })}
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
      )}

      <Animated.View
        style={[styles.topBar, chromeStyle]}
      >
        <View
          className="bg-media/50"
          style={[
            styles.topBarSurface,
            barPointerEvents,
            { paddingTop: insets.top + BAR_PADDING, paddingLeft: insets.left + t.layout.related, paddingRight: insets.right + t.layout.related, borderBottomColor: c.subtle },
          ]}
        >
          <Action kind="text" icon={X} iconSize={t.icon.large} label="Close" onPress={onClose} />
          {counter && (
            <Copy mono size="label" accessibilityLabel={`Item ${index + 1} of ${items.length}`} style={styles.counter}>
              {counter}
            </Copy>
          )}
        </View>
      </Animated.View>

      {visibleActions.length > 0 && (
        <Animated.View
          style={[styles.bottomBar, chromeStyle]}
        >
          <View
            className="bg-media/50"
            style={[
              styles.bottomBarSurface,
              barPointerEvents,
              {
                paddingBottom: insets.bottom + BAR_PADDING,
                paddingLeft: insets.left + t.layout.related,
                paddingRight: insets.right + t.layout.related,
                borderTopColor: c.subtle,
              },
            ]}
          >
            {visibleActions.map((action) => (
              <Action
                key={action}
                kind="text"
                icon={ACTION_META[action].icon}
                iconSize={t.icon.large}
                label={ACTION_META[action].label}
                destructive={action === 'delete'}
                loading={actions.busy === action}
                disabled={actions.busy !== null && actions.busy !== action}
                onPress={() => runAction(action)}
              />
            ))}
          </View>
        </Animated.View>
      )}
    </View>
  );
}

const keyExtractor = (item: MediaViewerItem, index: number) => `${item.uri}-${index}`;

const styles = StyleSheet.create({
  fill: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFill, zIndex: 20 },
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, pointerEvents: 'box-none' },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, pointerEvents: 'box-none' },
  topBarSurface: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: BAR_PADDING,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  bottomBarSurface: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingTop: BAR_PADDING,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  counter: { paddingHorizontal: t.layout.related },
});
