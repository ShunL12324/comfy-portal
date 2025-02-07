import { useThemeStore } from '@/store/theme';
import * as Haptics from 'expo-haptics';
import { Minus, Plus } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import { LayoutChangeEvent, TouchableOpacity, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Icon } from '../ui/icon';
import { Text } from '../ui/text';

const AnimatedText = Animated.createAnimatedComponent(Text);

/**
 * Props for the SmoothSlider component
 * @interface SmoothSliderProps
 */
interface SmoothSliderProps {
  /** Initial value of the slider */
  initialValue: number;
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
  initialValue,
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
  const animatedValue = useSharedValue(initialValue ?? 0);
  const lastUpdate = useSharedValue(0);
  const [displayValue, setDisplayValue] = useState(initialValue ?? 0);

  // 缓存精度计算
  const precision = useCallback(() => {
    'worklet';
    return decimalPlaces ?? (step.toString().split('.')[1] || '').length;
  }, [decimalPlaces, step]);

  // 缓存格式化函数
  const formatValue = useCallback(
    (value: number) => {
      'worklet';
      return value.toFixed(precision());
    },
    [precision],
  );

  // 使用 useAnimatedReaction 来批量处理值的更新，减少重绘
  useAnimatedReaction(
    () => {
      return {
        value: animatedValue.value,
        isDragging: isDragging.value,
        time: Date.now(),
      };
    },
    (current, previous) => {
      if (!previous || current.value !== previous.value) {
        // 如果正在拖动，则降低更新频率（每50ms更新一次）
        if (!current.isDragging || current.time - lastUpdate.value > 50) {
          lastUpdate.value = current.time;
          runOnJS(setDisplayValue)(current.value);
          if (onChange) {
            runOnJS(onChange)(current.value);
          }
        }
      }
    },
    [onChange],
  );

  const valueToPosition = useCallback(
    (val: number) => {
      'worklet';
      if (sliderWidth.value === 0) return 0;
      const range = maxValue - minValue;
      if (range === 0) return 0;
      const percentage = (val - minValue) / range;
      return Math.max(
        0,
        Math.min(percentage * sliderWidth.value, sliderWidth.value),
      );
    },
    [maxValue, minValue],
  );

  const positionToValue = useCallback(
    (pos: number) => {
      'worklet';
      if (sliderWidth.value === 0) return minValue;
      const range = maxValue - minValue;
      if (range === 0) return minValue;
      const percentage = pos / sliderWidth.value;
      const rawValue = percentage * range + minValue;
      const steppedValue =
        Math.round((rawValue - minValue) / step) * step + minValue;
      return Number(formatValue(steppedValue));
    },
    [maxValue, minValue, step, formatValue],
  );

  const onLayout = useCallback(
    (event: LayoutChangeEvent) => {
      'worklet';
      const width = event.nativeEvent.layout.width;
      sliderWidth.value = width;
      // Calculate initial position based on initialValue
      const range = maxValue - minValue;
      const percentage = (initialValue - minValue) / range;
      position.value = percentage * width;
    },
    [initialValue, maxValue, minValue],
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
    .onChange((event) => {
      'worklet';
      const newPosition = Math.max(
        0,
        Math.min(startPosition.value + event.translationX, sliderWidth.value),
      );

      // 使用 requestAnimationFrame 来限制更新频率
      position.value = newPosition;
      animatedValue.value = positionToValue(newPosition);
    })
    .onEnd(() => {
      'worklet';
      isDragging.value = false;
      // 结束时强制更新一次确保最终值准确
      const finalValue = positionToValue(position.value);
      animatedValue.value = finalValue;
      runOnJS(setDisplayValue)(finalValue);
      if (onChangeEnd) {
        runOnJS(onChangeEnd)(finalValue);
      }
      handleHapticFeedback();
    });

  // 优化动画样式，减少计算量
  const thumbStyle = useAnimatedStyle(
    () => ({
      transform: [{ translateX: position.value - thumbSize / 2 }],
    }),
    [thumbSize],
  );

  const trackActiveStyle = useAnimatedStyle(() => ({
    width: position.value,
  }));

  const valueDisplayStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: position.value - 24 }],
  }));

  const adjustValue = useCallback(
    (delta: number) => {
      'worklet';
      const newValue = Number(
        Math.min(
          Math.max(animatedValue.value + delta, minValue),
          maxValue,
        ).toFixed(precision()),
      );
      animatedValue.value = newValue;
      position.value = withTiming(valueToPosition(newValue), {
        duration: 150,
      });
      handleHapticFeedback();
    },
    [minValue, maxValue, precision, valueToPosition, handleHapticFeedback],
  );

  return (
    <View className="flex-1 flex-col gap-2">
      <View
        className={`${styles.container} ${className}`}
        style={{ height: thumbSize + 32 }}
      >
        {showButtons && (
          <View style={{ marginTop: 32 }}>
            <TouchableOpacity
              onPress={() => adjustValue(-step)}
              disabled={displayValue <= minValue}
              className={
                displayValue <= minValue ? styles.button.disabled : undefined
              }
              style={{ marginRight: space }}
            >
              <View
                className={styles.button.base}
                style={{ width: thumbSize, height: thumbSize }}
              >
                <Icon as={Minus} size="sm" className={styles.icon} />
              </View>
            </TouchableOpacity>
          </View>
        )}

        <View className="flex-1" style={{ height: thumbSize + 32 }}>
          <Animated.View
            className="absolute top-0 items-center justify-center"
            style={[{ width: 48 }, valueDisplayStyle]}
          >
            <View className="rounded-lg bg-background-100 px-2 py-1">
              <Text size="sm" bold className="text-typography-900">
                {displayValue.toFixed(
                  decimalPlaces ?? (step.toString().split('.')[1] || '').length,
                )}
              </Text>
            </View>
          </Animated.View>

          <View
            onLayout={onLayout}
            className="flex-1"
            style={{ height: thumbSize, marginTop: 32 }}
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
              className={styles.track.active}
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
          <View style={{ marginTop: 32 }}>
            <TouchableOpacity
              onPress={() => adjustValue(step)}
              disabled={displayValue >= maxValue}
              className={
                displayValue >= maxValue ? styles.button.disabled : undefined
              }
              style={{ marginLeft: space }}
            >
              <View
                className={styles.button.base}
                style={{ width: thumbSize, height: thumbSize }}
              >
                <Icon as={Plus} size="sm" className={styles.icon} />
              </View>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}
