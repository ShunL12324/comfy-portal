import { memo } from 'react';
import { Platform } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useDerivedValue, withTiming } from 'react-native-reanimated';

interface ProgressOverlayProps {
  current: number;
  total: number;
}

export const ProgressOverlay = memo(function ProgressOverlay({ current, total }: ProgressOverlayProps) {
  const duration = Platform.select({ ios: 300, android: 200 }) ?? 200;

  const progress = useDerivedValue(() => {
    if (total === 0) return 0;
    return withTiming((current / total) * 100, {
      duration,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
    });
  }, [current, total, duration]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${progress.value}%`,
  }));

  return <Animated.View className="absolute bottom-0 h-full bg-black/50" style={animatedStyle} />;
});
