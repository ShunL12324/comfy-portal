import { FilterChips } from '@/components/ui/design-system/filter-chips';
import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, View } from 'react-native';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Action, Copy, useDesign, DesignColorProvider } from '@/components/ui/design-system/primitives';
import { X, PlayCircle } from '@/constants/icons';
import { ZoomableMedia } from '@/features/generation/components/media-preview/zoomable-media';
import { useMediaStore, type MediaAsset } from '../stores/media-store';
import { EmptyGalleryArt } from './empty-gallery-art';
import { designTokens as t, iconStroke } from '@/constants/design-tokens';

function VideoTile({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (video) => { video.muted = true; video.pause(); });
  return <VideoView player={player} nativeControls={false} contentFit="cover" style={{ width: '100%', height: '100%' }} />;
}

/** One media collection, optionally scoped to a server. No date groups or duplicated storage. */
export function Gallery({ serverId }: { serverId?: string }) {
  const c = useDesign();
  const insets = useSafeAreaInsets();
  const all = useMediaStore((state) => state.assets);
  const [filter, setFilter] = useState('All');
  // Unset until measured. Starting from a guessed width drew one frame of
  // wrongly sized tiles that visibly jumped once onLayout arrived; an empty
  // frame is quieter than a wrong one.
  const [width, setWidth] = useState<number>();
  const [preview, setPreview] = useState<MediaAsset | null>(null);
  const assets = useMemo(() => all.filter((asset) =>
    (!serverId || asset.serverId === serverId) &&
    (filter === 'All' || asset.kind === (filter === 'Images' ? 'image' : 'video'))), [all, filter, serverId]);
  const hasMedia = all.some((asset) => !serverId || asset.serverId === serverId);
  const columns = width !== undefined && width >= 480 ? 4 : 3;
  const size = width === undefined ? 0 : (width - (columns - 1) * t.layout.label) / columns;
  // Square tiles with a 4-point gap, so a row's pitch is exact.
  const rowPitch = size + t.layout.label;
  const noun = filter === 'All' ? 'media' : filter.toLowerCase();
  return (
    <View style={{ flex: 1, gap: t.layout.field }} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      {hasMedia && <FilterChips label="Media type" value={filter} onChange={setFilter}
        options={['All', 'Images', 'Videos'].map((value) => ({ value, label: value }))} />}
      {width !== undefined && <FlatList
        key={columns} data={assets} numColumns={columns} keyExtractor={(asset) => asset.id}
        columnWrapperStyle={{ gap: t.layout.label }} contentContainerStyle={{ gap: t.layout.label, paddingBottom: t.layout.gutter }}
        /**
         * Bounded so the number of live video players stays proportional to
         * what is on screen. Every video tile holds its own `useVideoPlayer`,
         * i.e. a native player object, purely to show a paused first frame. At
         * the default windowSize of 21 the list keeps ten viewports of tiles
         * mounted either side of the visible one — roughly 380 tiles on a
         * phone at three columns — and since the pool became global this list
         * is the user's whole history rather than one workflow's output. Five
         * viewports' worth is enough to scroll smoothly.
         *
         * `removeClippedSubviews` is deliberately not set: it has a history of
         * blanking cells on iOS, and unmounting out-of-window rows already
         * releases the players. The real fix is not to create a player for a
         * still frame at all, which needs thumbnail generation and a cache.
         */
        windowSize={5}
        initialNumToRender={columns * 8}
        maxToRenderPerBatch={columns * 4}
        getItemLayout={(_, index) => ({ length: rowPitch, offset: rowPitch * Math.floor(index / columns), index })}
        ListEmptyComponent={<View style={{ alignItems: 'center', paddingTop: t.layout.section * 4, gap: t.layout.inset }}>
          <EmptyGalleryArt />
          {/* This grid holds images and videos; the copy has to cover both. */}
          <Copy size="section">No {noun} yet</Copy>
          <Copy muted>Your generated images and videos will appear here.</Copy>
        </View>}
        renderItem={({ item }) => (
          <Pressable accessibilityRole="button" accessibilityLabel={`Preview ${item.kind}`} onPress={() => setPreview(item)}
            style={{ width: size, height: size, borderRadius: t.radius.control, overflow: 'hidden', backgroundColor: c.well }}>
            {item.kind === 'video' ? <VideoTile uri={item.path} /> :
              <Image source={{ uri: item.path }} contentFit="cover" style={{ width: size, height: size }} />}
            {item.kind === 'video' && <View pointerEvents="none" style={{ position: 'absolute', right: 6, bottom: 6 }}>
              <PlayCircle size={t.icon.medium} color={c.onMedia} strokeWidth={iconStroke(t.icon.medium)} />
            </View>}
          </Pressable>
        )}
      />}
      <Modal visible={!!preview} animationType="fade" onRequestClose={() => setPreview(null)}>
        <View style={{ flex: 1, backgroundColor: c.media }}>
          {preview && <ZoomableMedia mediaUrl={preview.path} isActive onClose={() => setPreview(null)} onLongPress={() => {}} />}
          <View style={{ position: 'absolute', left: 20, right: 20, top: insets.top + 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Copy style={{ color: c.onMedia }}>Preview</Copy>
            <DesignColorProvider value={{ ...c, ink: c.onMedia }}><Action icon={X} iconSize={t.icon.large} kind="text" label="Close preview" onPress={() => setPreview(null)} /></DesignColorProvider>
          </View>
        </View>
      </Modal>
    </View>
  );
}
