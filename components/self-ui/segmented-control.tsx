import React, { useCallback, useEffect } from 'react';
import { Pressable } from '../ui/pressable';
import { Text } from '../ui/text';
import { View, LayoutChangeEvent } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
} from 'react-native-reanimated';

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
}

/**
 * Spring animation configuration for the slider
 */
const springConfig = {
  damping: 20,
  mass: 0.8,
  stiffness: 250,
};

/**
 * A customizable segmented control component with smooth animations
 * @component
 */
export const SegmentedControl: React.FC<SegmentedControlProps> = ({
  options,
  value,
  onChange,
}) => {
  const selectedIndex = options.indexOf(value);
  const translateX = useSharedValue(0);
  const width = useSharedValue(0);

  /**
   * Updates the slider position when selection or options change
   */
  useEffect(() => {
    translateX.value = withSpring(
      selectedIndex * (width.value / options.length),
      springConfig,
    );
  }, [selectedIndex, options.length, width.value]);

  /**
   * Handles the layout measurement and initial positioning
   */
  const onLayout = useCallback(
    (event: LayoutChangeEvent) => {
      width.value = event.nativeEvent.layout.width;
      translateX.value =
        selectedIndex * (event.nativeEvent.layout.width / options.length);
    },
    [selectedIndex, options.length],
  );

  /**
   * Animated style for the sliding indicator
   */
  const sliderStyle = useAnimatedStyle(() => {
    const segmentWidth = width.value / options.length;
    return {
      transform: [{ translateX: translateX.value }],
      width: segmentWidth - 8,
    };
  });

  return (
    <View
      className="h-10 flex-row overflow-hidden rounded-[10px] bg-background-300"
      onLayout={onLayout}
    >
      <Animated.View
        className="absolute left-1 top-1 h-8 rounded-lg bg-background-50"
        style={sliderStyle}
      />
      {options.map((option) => (
        <Pressable
          key={option}
          className="h-full flex-1 items-center justify-center px-1"
          onPress={() => onChange(option)}
        >
          <Text
            className={`text-[11px] font-medium ${
              value === option ? 'text-typography-900' : 'text-typography-500'
            }`}
          >
            {option}
          </Text>
        </Pressable>
      ))}
    </View>
  );
};
