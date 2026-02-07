import { View } from '@/components/ui/view';
import { useEffect } from 'react';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

type SpinnerSize = 'sm' | 'md' | 'lg' | number;
type SpinnerPreset = 'default' | 'subtle';

interface RotatingSpinnerProps {
  preset?: SpinnerPreset;
  size?: SpinnerSize;
  duration?: number;
  thickness?: number;
  className?: string;
  trackClassName?: string;
  indicatorClassName?: string;
}

const SIZE_MAP: Record<'sm' | 'md' | 'lg', number> = {
  sm: 16,
  md: 22,
  lg: 30,
};

const PRESET_CONFIG: Record<
  SpinnerPreset,
  { duration: number; thickness: number; trackClassName: string; indicatorClassName: string }
> = {
  default: {
    duration: 820,
    thickness: 1.5,
    trackClassName: 'border-outline-100',
    indicatorClassName: 'border-t-primary-500 border-r-primary-400',
  },
  subtle: {
    duration: 980,
    thickness: 1.25,
    trackClassName: 'border-outline-100',
    indicatorClassName: 'border-t-primary-400 border-r-primary-300',
  },
};

function resolveSize(size: SpinnerSize): number {
  if (typeof size === 'number') {
    return size;
  }
  return SIZE_MAP[size];
}

export function RotatingSpinner({
  preset = 'default',
  size = 'md',
  duration,
  thickness,
  className,
  trackClassName,
  indicatorClassName,
}: RotatingSpinnerProps) {
  const resolvedSize = resolveSize(size);
  const presetConfig = PRESET_CONFIG[preset];
  const resolvedDuration = duration ?? presetConfig.duration;
  const resolvedThickness = thickness ?? presetConfig.thickness;
  const resolvedTrackClassName = trackClassName ?? presetConfig.trackClassName;
  const resolvedIndicatorClassName = indicatorClassName ?? presetConfig.indicatorClassName;
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = 0;
    rotation.value = withRepeat(
      withTiming(359.9, {
        duration: resolvedDuration,
        easing: Easing.linear,
      }),
      -1,
      false,
    );

    return () => {
      cancelAnimation(rotation);
    };
  }, [resolvedDuration, rotation]);

  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <View className={className} style={{ width: resolvedSize, height: resolvedSize }}>
      <View className={`absolute inset-0 rounded-full border ${resolvedTrackClassName}`} style={{ borderWidth: resolvedThickness }} />
      <Animated.View
        className={`absolute inset-0 rounded-full border border-b-transparent border-l-transparent ${resolvedIndicatorClassName}`}
        style={[{ borderWidth: resolvedThickness }, spinStyle]}
      />
    </View>
  );
}
