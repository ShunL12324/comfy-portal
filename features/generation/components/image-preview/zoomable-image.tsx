import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import React, { memo, useRef } from 'react';
import { ScrollView, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';

import { runOnJS } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ZoomableImageProps {
  imageUrl: string;
  onClose: () => void;
  onLongPress: () => void;
}

export const ZoomableImage = memo(function ZoomableImage({
  imageUrl,
  onClose,
  onLongPress,
}: ZoomableImageProps) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);

  const isVideo = React.useMemo(() => {
    const ext = imageUrl.split('.').pop()?.toLowerCase();
    return ['mp4', 'mov', 'm4v', 'webm'].includes(ext || '');
  }, [imageUrl]);

  const player = useVideoPlayer(isVideo ? imageUrl : null, player => {
    if (isVideo) {
      player.loop = true;
      player.play();
    }
  });

  // Double tap to zoom
  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      // We can't easily programmatically zoom ScrollView without native modules or reanimated hacks,
      // but for now, let's just rely on pinch-to-zoom which is native.
      // Or we could implement a simple toggle if needed, but native pinch is the priority.
    });

  // Single tap to close/toggle UI
  const singleTap = Gesture.Tap()
    .numberOfTaps(1)
    .onEnd(() => {
      if (onClose) {
        runOnJS(onClose)();
      }
    });

  // Long press for menu
  const longPress = Gesture.LongPress()
    .onEnd(() => {
      if (onLongPress) {
        runOnJS(onLongPress)();
      }
    });

  // Exclusive gestures
  const taps = Gesture.Exclusive(doubleTap, singleTap, longPress);

  if (isVideo) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <GestureDetector gesture={taps}>
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

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <GestureDetector gesture={taps}>
        <ScrollView
          ref={scrollViewRef}
          style={{ flex: 1, width: '100%', height: '100%' }}
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'center',
            alignItems: 'center',
          }}
          maximumZoomScale={3}
          minimumZoomScale={1}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          centerContent
          bouncesZoom
        >
          <Image
            source={{ uri: imageUrl }}
            style={{
              width: screenWidth,
              height: screenHeight,
            }}
            contentFit="contain"
          />
        </ScrollView>
      </GestureDetector>
    </GestureHandlerRootView>
  );
});
