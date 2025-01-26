import React, { memo } from 'react';
import { Animated } from 'react-native';
import { ImagePreview } from './image-preview';

/**
 * Props for the parallax scrolling image component
 */
interface ParallaxImageProps {
  /** Animated scroll value */
  scrollY: Animated.Value;
  /** Height of the image container */
  imageHeight: number;
  /** URL of the image to display */
  imageUrl?: string;
  /** Progress information for image generation */
  progress?: { current: number; total: number };
  /** Whether the preview modal is open */
  isPreviewOpen: boolean;
  /** Callback when preview is closed */
  onPreviewClose: () => void;
}

/**
 * A component that displays an image with parallax scrolling effect
 */
export const ParallaxImage = memo(function ParallaxImage({
  scrollY,
  imageHeight,
  imageUrl,
  progress,
  isPreviewOpen,
  onPreviewClose,
}: ParallaxImageProps) {
  const scale = scrollY.interpolate({
    inputRange: [-imageHeight, 0],
    outputRange: [1.5, 1],
    extrapolate: 'clamp',
  });

  const translateY = scrollY.interpolate({
    inputRange: [-imageHeight, 0, imageHeight],
    outputRange: [0, 0, -imageHeight / 3],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: imageHeight,
        zIndex: 1,
      }}
    >
      <Animated.View
        style={{
          height: imageHeight,
          transform: [{ scale }, { translateY }],
        }}
      >
        <ImagePreview
          imageUrl={imageUrl}
          progress={progress}
          isPreviewOpen={isPreviewOpen}
          onPreviewClose={onPreviewClose}
        />
      </Animated.View>
    </Animated.View>
  );
});
