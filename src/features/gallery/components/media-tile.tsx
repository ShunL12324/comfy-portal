import { useDesign } from '@/components/ui/design-system/primitives';
import { designTokens as t, iconStroke } from '@/constants/design-tokens';
import { Check, PlayCircle } from '@/constants/icons';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

/** The selected tile's outline; heavy enough to read over any image. */
const SELECTED_OUTLINE = 2;
/** The check plate: a 12-point glyph on a 20-point square. */
const CHECK_PLATE = t.icon.large;

function VideoFrame({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (video) => {
    video.muted = true;
    video.pause();
  });
  return <VideoView player={player} nativeControls={false} contentFit="cover" style={styles.fill} />;
}

interface MediaTileProps {
  uri: string;
  kind: 'image' | 'video';
  /** A square of this many points; without it the tile fills its cell's width. */
  size?: number;
  selecting: boolean;
  selected: boolean;
  onPress: (uri: string) => void;
  onLongPress: (uri: string) => void;
}

/**
 * One square of a media grid, shared by the Gallery tab and History. A tap
 * opens the viewer, or toggles the tile while selecting; a long-press starts
 * selecting. While selecting every tile shows a check plate, and a selected
 * tile is dimmed and outlined so the choice reads at a glance.
 */
export const MediaTile = memo(function MediaTile({
  uri,
  kind,
  size,
  selecting,
  selected,
  onPress,
  onLongPress,
}: MediaTileProps) {
  const c = useDesign();
  const noun = kind === 'video' ? 'video' : 'image';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={selecting ? `Select ${noun}` : `Preview ${noun}`}
      accessibilityState={selecting ? { selected } : undefined}
      onPress={() => onPress(uri)}
      onLongPress={() => onLongPress(uri)}
      style={[
        size === undefined ? styles.cell : { width: size, height: size },
        { borderRadius: t.radius.control, overflow: 'hidden', backgroundColor: c.well },
      ]}
    >
      {kind === 'video' ? (
        <VideoFrame uri={uri} />
      ) : (
        <Image source={{ uri }} contentFit="cover" cachePolicy="memory-disk" recyclingKey={uri} style={styles.fill} />
      )}
      {kind === 'video' && (
        <View pointerEvents="none" style={styles.play}>
          <PlayCircle size={t.icon.medium} color={c.onMedia} strokeWidth={iconStroke(t.icon.medium)} />
        </View>
      )}
      {selected && (
        <View
          pointerEvents="none"
          className="bg-media/40"
          style={[
            StyleSheet.absoluteFill,
            { borderRadius: t.radius.control, borderWidth: SELECTED_OUTLINE, borderColor: c.onMedia },
          ]}
        />
      )}
      {selecting && (
        <View
          pointerEvents="none"
          className={selected ? undefined : 'bg-media/30'}
          style={[
            styles.check,
            selected ? { backgroundColor: c.onMedia, borderColor: c.onMedia } : { borderColor: c.onMedia },
          ]}
        >
          {selected && <Check size={t.icon.micro} color={c.media} strokeWidth={iconStroke(t.icon.micro)} />}
        </View>
      )}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  fill: { width: '100%', height: '100%' },
  cell: { width: '100%', aspectRatio: 1 },
  play: { position: 'absolute', right: t.layout.status, bottom: t.layout.status },
  check: {
    position: 'absolute',
    top: t.layout.status,
    right: t.layout.status,
    width: CHECK_PLATE,
    height: CHECK_PLATE,
    borderRadius: t.radius.small,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
