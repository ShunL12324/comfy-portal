import { Pressable } from '@/components/ui/pressable';
import { Colors } from '@/constants/Colors';
import { useThemeStore } from '@/store/theme';
import { useCallback } from 'react';
import Animated, { interpolateColor, useAnimatedStyle, useDerivedValue, withSpring } from 'react-native-reanimated';

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
  const theme = useThemeStore((state) => state.theme);
  const isDark = theme === 'dark';

  // Animation progress value
  const progress = useDerivedValue(() => {
    return withSpring(value ? 1 : 0, {
      mass: 1,
      damping: 15,
      stiffness: 120,
      overshootClamping: false,
      restSpeedThreshold: 0.001,
      restDisplacementThreshold: 0.001,
    });
  }, [value]);

  // Animated styles for the thumb
  const thumbStyle = useAnimatedStyle(() => {
    const dimensions = SIZES[size];
    const translateX = progress.value * (dimensions.width - dimensions.thumbSize - 4);

    return {
      transform: [{ translateX }],
      width: dimensions.thumbSize,
      height: dimensions.thumbSize,
    };
  });

  // Animated styles for the track
  const trackStyle = useAnimatedStyle(() => {
    const activeColor = isDark ? Colors.dark.primary[500] : Colors.light.primary[500];
    const inactiveColor = isDark ? Colors.dark.background[50] : Colors.light.background[50];
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
      <Animated.View style={trackStyle} className="rounded-full border-[0.5px] border-outline-200">
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
