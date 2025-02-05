import { useThemeStore } from '@/store/theme';
import * as Haptics from 'expo-haptics';
import { Minus, Plus } from 'lucide-react-native';
import React, { useCallback, useEffect } from 'react';
import { LayoutChangeEvent, TouchableOpacity, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Icon } from '../ui/icon';

/**
 * Props for the SmoothSlider component
 * @interface SmoothSliderProps
 */
interface SmoothSliderProps {
  /** Current value of the slider */
  value: number;
  /** Minimum value of the slider (default: 0) */
  minValue?: number;
  /** Maximum value of the slider (default: 100) */
  maxValue?: number;
  /** Step size for value changes (default: 1) */
  step?: number;
  /** Callback fired when the value changes */
  onChange?: (value: number) => void;
  /** Callback fired when the sliding gesture ends */
  onChangeEnd?: (value: number) => void;
  /** Additional className for styling */
  className?: string;
  /** Whether to show the buttons (default: true) */
  showButtons?: boolean;
  /** 小数位数（默认自动根据step计算） */
  decimalPlaces?: number;
  /** Thumb size in pixels (default: 32) */
  thumbSize?: number;
  /** Track height in pixels (default: 4) */
  trackHeight?: number;
  /** Space between elements in pixels (default: 16) */
  space?: number;
}

// Constants
const THUMB_SIZE = 32; // 8 * 4 = 32px
const TRACK_HEIGHT = 4; // 1 * 4 = 4px

// Styles
const styles = {
  container: 'flex-row items-center',
  button: {
    base: 'items-center justify-center rounded-lg bg-background-200',
    disabled: 'opacity-50',
  },
  icon: 'text-typography-400',
  track: {
    container: 'relative w-full justify-center',
    background: 'absolute w-full rounded-full bg-background-100',
    active: 'absolute rounded-l-full bg-background-600',
  },
  thumb:
    'absolute items-center justify-center rounded-full bg-primary-400 shadow-sm',
} as const;

/**
 * A smooth, animated slider component with haptic feedback
 * @param {SmoothSliderProps} props - The component props
 * @returns {JSX.Element} The rendered slider component
 */
export function SmoothSlider({
  value,
  minValue = 0,
  maxValue = 100,
  step = 1,
  onChange,
  onChangeEnd,
  className = '',
  showButtons = true,
  decimalPlaces,
  thumbSize = 24,
  trackHeight = 12,
  space = 24,
}: SmoothSliderProps) {
  const { theme } = useThemeStore();
  const sliderWidth = useSharedValue(0);
  const position = useSharedValue(0);
  const isDragging = useSharedValue(false);
  const startPosition = useSharedValue(0);

  const valueToPosition = useCallback(
    (val: number) => {
      'worklet';
      const range = maxValue - minValue;
      const percentage = (val - minValue) / range;
      return percentage * sliderWidth.value;
    },
    [maxValue, minValue, sliderWidth.value],
  );

  const positionToValue = useCallback(
    (pos: number) => {
      'worklet';
      const range = maxValue - minValue;
      const percentage = pos / sliderWidth.value;
      const rawValue = percentage * range + minValue;
      const precision =
        decimalPlaces ?? (step.toString().split('.')[1] || '').length;
      const steppedValue =
        Math.round((rawValue - minValue) / step) * step + minValue;
      return Number(steppedValue.toFixed(precision));
    },
    [maxValue, minValue, step, sliderWidth.value, decimalPlaces],
  );

  useEffect(() => {
    if (!isDragging.value) {
      position.value = withTiming(valueToPosition(value), {
        duration: 150,
      });
    }
  }, [value, valueToPosition]);

  const onLayout = useCallback(
    (event: LayoutChangeEvent) => {
      'worklet';
      sliderWidth.value = event.nativeEvent.layout.width;
      position.value = valueToPosition(value);
    },
    [valueToPosition, value],
  );

  const handleHapticFeedback = useCallback(() => {
    'worklet';
    runOnJS(Haptics.selectionAsync)();
  }, []);

  const panGesture = Gesture.Pan()
    .onStart(() => {
      'worklet';
      startPosition.value = position.value;
      isDragging.value = true;
      handleHapticFeedback();
    })
    .onUpdate((e) => {
      'worklet';
      const newPosition = Math.max(
        0,
        Math.min(startPosition.value + e.translationX, sliderWidth.value),
      );
      position.value = newPosition;
      const newValue = positionToValue(newPosition);
      if (onChange) {
        runOnJS(onChange)(newValue);
      }
    })
    .onEnd(() => {
      'worklet';
      isDragging.value = false;
      const finalValue = positionToValue(position.value);
      if (onChangeEnd) {
        runOnJS(onChangeEnd)(finalValue);
      }
      handleHapticFeedback();
    });

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: position.value - thumbSize / 2 }],
  }));

  const trackActiveStyle = useAnimatedStyle(() => ({
    width: position.value,
  }));

  const adjustValue = useCallback(
    (delta: number) => {
      'worklet';
      const precision =
        decimalPlaces ?? (step.toString().split('.')[1] || '').length;
      const newValue = Number(
        Math.min(Math.max(value + delta, minValue), maxValue).toFixed(
          precision,
        ),
      );
      if (newValue !== value) {
        position.value = withTiming(valueToPosition(newValue), {
          duration: 150,
        });
        if (onChange) {
          runOnJS(onChange)(newValue);
        }
        if (onChangeEnd) {
          runOnJS(onChangeEnd)(newValue);
        }
        handleHapticFeedback();
      }
    },
    [value, minValue, maxValue, onChange, onChangeEnd, step, decimalPlaces],
  );

  return (
    <View
      className={`${styles.container} ${className}`}
      style={{ height: thumbSize }}
    >
      {showButtons && (
        <TouchableOpacity
          onPress={() => adjustValue(-step)}
          disabled={value <= minValue}
          className={value <= minValue ? styles.button.disabled : undefined}
          style={{ marginRight: space }}
        >
          <View
            className={styles.button.base}
            style={{ width: thumbSize, height: thumbSize }}
          >
            <Icon as={Minus} size="sm" className={styles.icon} />
          </View>
        </TouchableOpacity>
      )}

      <View style={{ flex: 1, height: thumbSize }}>
        <View
          onLayout={onLayout}
          className={styles.track.container}
          style={{ height: thumbSize }}
        >
          <View
            className={styles.track.background}
            style={{
              height: trackHeight,
              top: '50%',
              marginTop: -trackHeight / 2,
              zIndex: 1,
            }}
          />
          <Animated.View
            className={`${styles.track.active} rounded-l-full`}
            style={[
              {
                height: trackHeight,
                top: '50%',
                marginTop: -trackHeight / 2,
                zIndex: 2,
              },
              trackActiveStyle,
            ]}
          />
          <GestureDetector gesture={panGesture}>
            <Animated.View
              className={styles.thumb}
              style={[
                {
                  width: thumbSize,
                  height: thumbSize,
                  position: 'absolute',
                  top: '50%',
                  marginTop: -thumbSize / 2,
                  zIndex: 3,
                },
                thumbStyle,
              ]}
            />
          </GestureDetector>
        </View>
      </View>

      {showButtons && (
        <TouchableOpacity
          onPress={() => adjustValue(step)}
          disabled={value >= maxValue}
          className={value >= maxValue ? styles.button.disabled : undefined}
          style={{ marginLeft: space }}
        >
          <View
            className={styles.button.base}
            style={{ width: thumbSize, height: thumbSize }}
          >
            <Icon as={Plus} size="sm" className={styles.icon} />
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
}
