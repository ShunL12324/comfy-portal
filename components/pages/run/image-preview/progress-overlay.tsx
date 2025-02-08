import { memo, useEffect } from 'react';
import { Platform } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

interface ProgressOverlayProps {
  current: number;
  total: number;
}

export const ProgressOverlay = memo(function ProgressOverlay({ current, total }: ProgressOverlayProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    const percentage = (current / total) * 100;
    progress.value = withTiming(percentage, {
      duration: Platform.select({
        ios: 300,
        android: 200,
      }),
      easing: Easing.bezier(0.4, 0, 0.2, 1),
    });
  }, [current, total]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${progress.value}%`,
  }));

  return <Animated.View className="absolute bottom-0 h-full bg-black/50 backdrop-blur-sm" style={animatedStyle} />;
});
