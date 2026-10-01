import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { memo, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import {
  fitContainer,
  ResumableZoom,
  type CommonZoomState,
  type ResumableZoomRefType,
} from 'react-native-zoom-toolkit';

import type { MediaViewerInfo } from './media-viewer-utils';

const MAX_SCALE = 5;
/** Below this the image counts as unzoomed; spring overshoot settles around 1. */
const ZOOMED_SCALE = 1.01;

interface ImagePageProps {
  uri: string;
  width: number;
  height: number;
  active: boolean;
  onTap: () => void;
  onZoomChange: (zoomed: boolean) => void;
  /** Reports the pixel size once the image has loaded, for the readout. */
  onInfo: (uri: string, info: MediaViewerInfo) => void;
}

/**
 * Pinch and double-tap zoom come from react-native-zoom-toolkit. Its pan stays
 * off until the image is zoomed, so at rest a horizontal drag belongs to the
 * pager and swipes to the next item; once zoomed the pager is locked by the
 * viewer and the same drag pans the image instead.
 */
export const ImagePage = memo(function ImagePage({
  uri,
  width,
  height,
  active,
  onTap,
  onZoomChange,
  onInfo,
}: ImagePageProps) {
  const ref = useRef<ResumableZoomRefType>(null);
  const [aspectRatio, setAspectRatio] = useState<number>();
  const [zoomed, setZoomed] = useState(false);
  const zoomedValue = useSharedValue(false);

  // Leaving a page resets it, so swiping back finds the whole image again.
  useEffect(() => {
    if (!active) ref.current?.reset(false);
  }, [active]);

  useEffect(() => {
    if (active) onZoomChange(zoomed);
  }, [active, zoomed, onZoomChange]);

  const onUpdate = (state: CommonZoomState<number>) => {
    'worklet';
    const next = state.scale > ZOOMED_SCALE;
    if (next === zoomedValue.value) return;
    zoomedValue.value = next;
    scheduleOnRN(setZoomed, next);
  };

  // Zoom bounds are computed from the child's size, so it must be the fitted
  // image rather than the whole page with letterboxing around it.
  const size = aspectRatio ? fitContainer(aspectRatio, { width, height }) : { width, height };

  return (
    <View style={{ width, height }}>
      <ResumableZoom
        ref={ref}
        maxScale={MAX_SCALE}
        extendGestures
        panEnabled={zoomed}
        onTap={onTap}
        onUpdate={onUpdate}
      >
        <Image
          source={{ uri }}
          style={size}
          contentFit="contain"
          cachePolicy="memory-disk"
          accessibilityIgnoresInvertColors
          onLoad={(event) => {
            const { width: w, height: h } = event.source;
            if (w > 0 && h > 0) {
              setAspectRatio(w / h);
              onInfo(uri, { width: w, height: h });
            }
          }}
        />
      </ResumableZoom>
    </View>
  );
});

interface VideoPageProps {
  uri: string;
  width: number;
  height: number;
  active: boolean;
  /** Space kept clear above and below so the viewer's bars never cover the native controls. */
  insetTop: number;
  insetBottom: number;
  /** Reports the length and frame size once the source has loaded, for the readout. */
  onInfo: (uri: string, info: MediaViewerInfo) => void;
}

/** Inline playback with the platform's own controls. */
export const VideoPage = memo(function VideoPage({
  uri,
  width,
  height,
  active,
  insetTop,
  insetBottom,
  onInfo,
}: VideoPageProps) {
  const player = useVideoPlayer(uri, (video) => {
    video.loop = true;
  });

  useEffect(() => {
    const subscription = player.addListener('sourceLoad', ({ duration, availableVideoTracks }) => {
      const frame = availableVideoTracks[0]?.size;
      onInfo(uri, { duration, width: frame?.width, height: frame?.height });
    });
    return () => subscription.remove();
  }, [player, uri, onInfo]);

  // Pages either side stay mounted for smooth swiping; only the page on screen
  // may play, or every mounted video would play over the one being watched.
  useEffect(() => {
    if (active) player.play();
    else player.pause();
  }, [active, player]);

  return (
    <View style={{ width, height, paddingTop: insetTop, paddingBottom: insetBottom }}>
      <VideoView
        player={player}
        style={{ flex: 1 }}
        contentFit="contain"
        nativeControls
        // A second fullscreen player stacked on a fullscreen viewer is a dead end.
        fullscreenOptions={{ enable: false }}
      />
    </View>
  );
});
