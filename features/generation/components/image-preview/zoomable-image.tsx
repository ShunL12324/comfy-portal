import { Image } from 'expo-image';
import React, { memo, useRef } from 'react';
import { ScrollView, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';

import { runOnJS } from 'react-native-reanimated';

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
  const scrollViewRef = useRef<ScrollView>(null);

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
