import React, { useCallback, useEffect, useMemo } from 'react';
import { LayoutChangeEvent, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Pressable } from '../ui/pressable';
import { Text } from '../ui/text';

// Create optimized animated components
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Animation configuration
 */
const TIMING_CONFIG = {
  duration: 150,
  easing: Easing.bezier(0.4, 0, 0.2, 1),
};

/**
 * Props for the SegmentedControl component
 */
interface SegmentedControlProps {
  /** Array of options to display in the control */
  options: string[];
  /** Currently selected option */
  value: string;
  /** Callback function when selection changes */
  onChange: (value: string) => void;
  /** Custom class name for the container */
  className?: string;
}

/**
 * A customizable segmented control component with smooth animations
 * @component
 */
export const SegmentedControl: React.FC<SegmentedControlProps> = ({ options, value, onChange, className }) => {
  const selectedIndex = options.indexOf(value);
  const translateX = useSharedValue(0);
  const width = useSharedValue(0);

  /**
   * Updates the slider position when selection or options change
   */
  useEffect(() => {
    if (selectedIndex !== -1 && width.value !== 0) {
      ('worklet');
      translateX.value = withTiming(selectedIndex * (width.value / options.length), TIMING_CONFIG);
    }
  }, [selectedIndex, options.length, width.value]);

  /**
   * Handles the layout measurement and initial positioning
   */
  const onLayout = useCallback(
    (event: LayoutChangeEvent) => {
      'worklet';
      const newWidth = event.nativeEvent.layout.width;
      width.value = newWidth;
      if (selectedIndex !== -1) {
        translateX.value = withTiming(selectedIndex * (newWidth / options.length), TIMING_CONFIG);
      }
    },
    [selectedIndex, options.length],
  );

  /**
   * Animated style for the sliding indicator
   */
  const sliderStyle = useAnimatedStyle(() => {
    'worklet';
    const segmentWidth = width.value / options.length;
    return {
      transform: [{ translateX: translateX.value }],
      width: segmentWidth - 8,
    };
  });

  // Memoize container style
  const containerStyle = useMemo(() => 'h-10 flex-row overflow-hidden rounded-[10px] bg-background-50', []);

  // Memoize slider base style
  const sliderBaseStyle = useMemo(() => 'absolute left-1 top-1 h-8 rounded-lg bg-background-200', []);

  // Memoize pressable base style
  const pressableBaseStyle = useMemo(() => 'h-full flex-1 items-center justify-center px-1', []);

  const getTextStyle = useCallback((isSelected: boolean) => {
    return `text-[11px] font-medium ${isSelected ? 'text-typography-900' : 'text-typography-500'}`;
  }, []);

  return (
    <View className={`${containerStyle} ${className}`} onLayout={onLayout}>
      <Animated.View className={sliderBaseStyle} style={sliderStyle} />
      {options.map((option) => (
        <AnimatedPressable key={option} className={`${pressableBaseStyle} flex-1`} onPress={() => onChange(option)}>
          <Text className={getTextStyle(value === option)}>{option}</Text>
        </AnimatedPressable>
      ))}
    </View>
  );
};
