import React, { useCallback, useEffect } from 'react';
import { Pressable } from './pressable';
import { Text } from './text';
import { View, LayoutChangeEvent } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
} from 'react-native-reanimated';
import { useThemeStore } from '@/store/theme';

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
 * Theme-specific colors for the component
 */
const getThemeColors = (isDark: boolean) => ({
  slider: isDark ? '#1F1F1F' : '#FFFFFF',
  background: isDark ? '#2A2A2A' : '#F0F0F0',
  activeText: isDark ? '#FFFFFF' : '#000000',
  inactiveText: isDark ? '#999999' : '#666666',
});

/**
 * A customizable segmented control component with smooth animations
 * @component
 */
export const SegmentedControl: React.FC<SegmentedControlProps> = ({
  options,
  value,
  onChange,
}) => {
  const theme = useThemeStore((state) => state.theme);
  const colors = getThemeColors(theme === 'dark');
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
      height: 32,
      position: 'absolute',
      backgroundColor: colors.slider,
      borderRadius: 8,
      top: 4,
      left: 4,
    };
  });

  return (
    <View
      style={{
        overflow: 'hidden',
        borderRadius: 10,
        backgroundColor: colors.background,
        height: 40,
        padding: 0,
        flexDirection: 'row',
      }}
      onLayout={onLayout}
    >
      <Animated.View style={sliderStyle} />
      {options.map((option) => (
        <Pressable
          key={option}
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            paddingHorizontal: 4,
          }}
          onPress={() => onChange(option)}
        >
          <Text
            style={{
              fontSize: 11,
              fontWeight: '500',
              color: value === option ? colors.activeText : colors.inactiveText,
            }}
          >
            {option}
          </Text>
        </Pressable>
      ))}
    </View>
  );
};
