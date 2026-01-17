import { Zoomable, type ZoomableRef } from '@likashefqet/react-native-image-zoom';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import React, { memo, useEffect, useRef } from 'react';
import { Pressable, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const VIDEO_EXTENSIONS = ['mp4', 'mov', 'm4v', 'webm'];

interface ZoomableMediaProps {
  mediaUrl: string;
  onClose: () => void;
  onLongPress: () => void;
}

export const ZoomableMedia = memo(function ZoomableMedia({
  mediaUrl,
  onClose,
  onLongPress,
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

  const isVideo = React.useMemo(() => {
    const ext = mediaUrl.split('.').pop()?.toLowerCase();
    return VIDEO_EXTENSIONS.includes(ext || '');
  }, [mediaUrl]);

  const player = useVideoPlayer(isVideo ? mediaUrl : null, player => {
    if (isVideo) {
      player.loop = true;
      player.play();
    }
  });

  // Video: Keep existing VideoView with gesture detection for close/long-press
  if (isVideo) {
    const singleTap = Gesture.Tap()
      .numberOfTaps(1)
      .onEnd(() => {
        runOnJS(onClose)();
      });

    const longPress = Gesture.LongPress()
      .onEnd(() => {
        runOnJS(onLongPress)();
      });

    const gestures = Gesture.Exclusive(longPress, singleTap);

    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <GestureDetector gesture={gestures}>
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
            />
          </View>
        </GestureDetector>
      </GestureHandlerRootView>
    );
  }

  // Image: Use Zoomable for zoom handling
  return (
    <Pressable
      style={{
        flex: 1,
        backgroundColor: 'black',
      }}
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
