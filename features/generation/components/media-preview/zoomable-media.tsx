import { isVideoUrl } from '@/features/generation/utils/media';
import { Zoomable, type ZoomableRef } from '@likashefqet/react-native-image-zoom';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import React, { memo, useEffect, useRef } from 'react';
import { Pressable, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ZoomableMediaProps {
  mediaUrl: string;
  onClose: () => void;
  onLongPress: () => void;
  /**
   * Whether this is the page the user is looking at. Swipeable previews keep
   * neighbours mounted so the next one is ready, and without this every mounted
   * video would play at once — several soundtracks over one picture.
   */
  isActive?: boolean;
}

export const ZoomableMedia = memo(function ZoomableMedia({
  mediaUrl,
  onClose,
  onLongPress,
  isActive = true,
}: ZoomableMediaProps) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const zoomableRef = useRef<ZoomableRef>(null);

  // Reset zoom when component mounts (modal opens)
  useEffect(() => {
    const timer = setTimeout(() => {
      zoomableRef.current?.reset();
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  const isVideo = React.useMemo(() => isVideoUrl(mediaUrl), [mediaUrl]);

  const player = useVideoPlayer(isVideo ? mediaUrl : null, player => {
    if (isVideo) {
      player.loop = true;
    }
  });

  // Playback follows activeness rather than mount, so this also covers swiping
  // away from a video and back.
  useEffect(() => {
    if (!isVideo) return;
    if (isActive) player.play();
    else player.pause();
  }, [isVideo, isActive, player]);

  // Video: the native controls own single taps. We used to layer a
  // tap-to-close gesture over them, but the recognizer sits on an ancestor of
  // the control overlay and fires alongside it — so the tap meant for the play
  // button both resumed playback and dismissed the preview, which reads as
  // "play exits the preview". Closing is the close button's job; only
  // long-press (which the native controls don't use) stays on the surface.
  if (isVideo) {
    const longPress = Gesture.LongPress()
      .onEnd(() => {
        runOnJS(onLongPress)();
      });

    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <GestureDetector gesture={longPress}>
          <View
            style={{
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: 'black',
              paddingTop: insets.top,
              paddingBottom: insets.bottom,
              paddingLeft: insets.left,
              paddingRight: insets.right,
            }}
          >
            <VideoView
              player={player}
              style={{
                width: '100%',
                height: '100%',
              }}
              contentFit="contain"
              nativeControls={true}
              // Frees the top-right corner for the preview's own close button,
              // and drops a dead end on the way: a second fullscreen player
              // stacked on an already-fullscreen preview.
              fullscreenOptions={{ enable: false }}
            />
          </View>
        </GestureDetector>
      </GestureHandlerRootView>
    );
  }

  // Image: Use Zoomable for zoom handling
  return (
    <Pressable
      className="flex-1 bg-black"
      onLongPress={onLongPress}
      delayLongPress={500}
    >
      <Zoomable
        ref={zoomableRef}
        minScale={1}
        maxScale={5}
        doubleTapScale={2.5}
        isSingleTapEnabled
        isDoubleTapEnabled
        onSingleTap={onClose}
      >
        <Image
          source={{ uri: mediaUrl }}
          style={{
            width: screenWidth,
            height: screenHeight,
          }}
          contentFit="contain"
        />
      </Zoomable>
    </Pressable>
  );
});
