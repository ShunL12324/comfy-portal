import { View } from '@/components/ui/view';
import React, { useEffect } from 'react';
import { View as NativeView, type ViewProps, type ColorValue } from 'react-native';
import { AnimatePresence, MotiView } from 'moti';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  useReducedMotion,
} from 'react-native-reanimated';

type SpinnerSize = 'sm' | 'md' | 'lg' | number;
type SpinnerPreset = 'default' | 'subtle';

interface RotatingSpinnerProps extends ViewProps {
  color?: ColorValue;
  animating?: boolean;
  hidesWhenStopped?: boolean;
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
    duration: 1000,
    thickness: 1.5,
    trackClassName: 'border-outline-100',
    indicatorClassName: 'border-t-primary-500 border-r-primary-400',
  },
  subtle: {
    duration: 1000,
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

export const RotatingSpinner = React.forwardRef<NativeView, RotatingSpinnerProps>(function RotatingSpinner(
  {
    preset = 'default',
    size = 'md',
    duration,
    thickness,
    className,
    trackClassName,
    indicatorClassName,
    color,
    animating = true,
    hidesWhenStopped = true,
    style,
    ...props
  },
  ref,
) {
  const resolvedSize = resolveSize(size);
  const presetConfig = PRESET_CONFIG[preset];
  const resolvedDuration = duration ?? presetConfig.duration;
  const resolvedThickness = thickness ?? presetConfig.thickness;
  const resolvedTrackClassName = trackClassName ?? presetConfig.trackClassName;
  const resolvedIndicatorClassName = indicatorClassName ?? presetConfig.indicatorClassName;
  const rotation = useSharedValue(0);
  const reduced = useReducedMotion();

  useEffect(() => {
    rotation.value = 0;
    if (!animating || reduced) return;
    rotation.value = withRepeat(
      withTiming(359.9, {
        duration: resolvedDuration,
        easing: Easing.linear,
      }),
      -1,
      false,
    );

    return () => cancelAnimation(rotation);
  }, [resolvedDuration, rotation, animating, reduced]);
  const spinStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotation.value}deg` }] }));
  return (
    <NativeView
      ref={ref}
      className={className}
      style={style}
      accessibilityRole={animating ? 'progressbar' : undefined}
      accessibilityLabel="Loading"
      {...props}
      aria-hidden={!animating || props['aria-hidden']}
      accessibilityElementsHidden={!animating || props.accessibilityElementsHidden}
    >
      <AnimatePresence>
        {animating || !hidesWhenStopped ? (
          <MotiView
            key="ring"
            from={{ opacity: 0, scale: 0.8, width: 0 }}
            animate={{ opacity: 1, scale: 1, width: resolvedSize }}
            exit={{ opacity: 0, scale: 0.8, width: 0 }}
            transition={{ type: 'timing', duration: reduced ? 0 : 180 }}
            style={{ height: resolvedSize, overflow: 'hidden' }}
          >
            <View
              className={`inset-0 absolute rounded-full border ${resolvedTrackClassName}`}
              style={{ borderWidth: resolvedThickness }}
            />
            <Animated.View
              className={`inset-0 absolute rounded-full border border-b-transparent border-l-transparent ${resolvedIndicatorClassName}`}
              style={[
                {
                  borderWidth: resolvedThickness,
                  ...(color ? { borderTopColor: color, borderRightColor: color } : {}),
                },
                spinStyle,
              ]}
            />
          </MotiView>
        ) : null}
      </AnimatePresence>
    </NativeView>
  );
});
