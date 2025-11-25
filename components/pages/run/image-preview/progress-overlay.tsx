import { memo, useEffect } from 'react';
import { Platform } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

interface ProgressOverlayProps {
  current: number;
  total: number;
}

export const ProgressOverlay = memo(function ProgressOverlay({ current, total }: ProgressOverlayProps) {
  const progress = useSharedValue(0);

  const lastUpdate = useSharedValue(0);

  useEffect(() => {
    const now = Date.now();
    const percentage = (current / total) * 100;

    // Always update if it's the first update, complete (100%), or enough time has passed (150ms)
    if (percentage === 100 || now - lastUpdate.value > 150 || lastUpdate.value === 0) {
      progress.value = withTiming(percentage, {
        duration: Platform.select({
          ios: 300,
          android: 200,
        }),
        easing: Easing.bezier(0.4, 0, 0.2, 1),
      });
      lastUpdate.value = now;
    }
  }, [current, total]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${progress.value}%`,
  }));

  return <Animated.View className="absolute bottom-0 h-full bg-black/50" style={animatedStyle} />;
});
