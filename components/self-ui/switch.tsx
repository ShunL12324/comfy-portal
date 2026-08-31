import { Pressable } from '@/components/ui/pressable';
import { Colors } from '@/constants/Colors';
import { useResolvedTheme } from '@/store/theme';
import { useCallback } from 'react';
import Animated, { interpolateColor, useAnimatedStyle, useDerivedValue, withTiming } from 'react-native-reanimated';

interface SwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const SIZES = {
  sm: {
    width: 44,
    height: 18,
    thumbSize: 14,
  },
  md: {
    width: 48,
    height: 26,
    thumbSize: 18,
  },
  lg: {
    width: 52,
    height: 30,
    thumbSize: 26,
  },
};

export default function Switch({ value, onValueChange, disabled = false, size = 'md' }: SwitchProps) {
  const theme = useResolvedTheme();
  const isDark = theme === 'dark';

  // Timing, not spring: the design system's motion never overshoots, so the
  // thumb travels and stops rather than settling.
  const progress = useDerivedValue(() => withTiming(value ? 1 : 0, { duration: 160 }), [value]);

  // Animated styles for the thumb
  const thumbStyle = useAnimatedStyle(() => {
    const dimensions = SIZES[size];
    const translateX = progress.value * (dimensions.width - dimensions.thumbSize - 4);

    // Shrinking the off-state thumb is what makes the state legible without
    // relying on the track colour alone.
    const scale = 0.82 + progress.value * 0.18;

    return {
      transform: [{ translateX }, { scale }],
      width: dimensions.thumbSize,
      height: dimensions.thumbSize,
    };
  });

  // Animated styles for the track
  const trackStyle = useAnimatedStyle(() => {
    const activeColor = isDark ? Colors.dark.typography[950] : Colors.light.typography[950];
    const inactiveColor = isDark ? Colors.dark.background[200] : Colors.light.background[200];
    const dimensions = SIZES[size];

    return {
      backgroundColor: interpolateColor(progress.value, [0, 1], [inactiveColor, activeColor]),
      width: dimensions.width,
      height: dimensions.height,
    };
  });

  const handlePress = useCallback(() => {
    if (!disabled) {
      onValueChange(!value);
    }
  }, [disabled, onValueChange, value]);

  return (
    <Pressable onPress={handlePress} style={{ opacity: disabled ? 0.5 : 1 }} className="items-center justify-center">
      <Animated.View style={trackStyle} className="rounded-full">
        <Animated.View
          style={[
            thumbStyle,
            {
              top: (SIZES[size].height - SIZES[size].thumbSize) / 2 - 0.5,
            },
          ]}
          className="absolute left-[2px] rounded-full bg-white shadow-sm"
        />
      </Animated.View>
    </Pressable>
  );
}
