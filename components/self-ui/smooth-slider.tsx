import React from 'react';
import { View, TextInput as RNTextInput, TextInputProps } from 'react-native';
import { TextInput } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useAnimatedGestureHandler,
  useSharedValue,
  withSpring,
  runOnJS,
  useAnimatedProps,
} from 'react-native-reanimated';
import { PanGestureHandler } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';

Animated.addWhitelistedNativeProps({ text: true });
const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

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
  /** Color of the unfilled track */
  trackColor?: string;
  /** Color of the filled track */
  filledTrackColor?: string;
  /** Color of the thumb */
  thumbColor?: string;
  /** Additional className for styling */
  className?: string;
  /** Whether to show the value label (default: true) */
  showValue?: boolean;
  /** Size of the thumb in pixels (default: 28) */
  thumbSize?: number;
  /** Height of the track in pixels (default: 24) */
  trackHeight?: number;
}

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
  showValue = true,
  thumbSize = 28,
  trackHeight = 24,
}: SmoothSliderProps) {
  const [trackWidth, setTrackWidth] = React.useState(240);

  /** Converts a value to its percentage representation */
  const valueToPercent = (val: number) => {
    'worklet';
    return ((val - minValue) / (maxValue - minValue)) * 100;
  };

  /** Converts a percentage to its corresponding value */
  const percentToValue = (percent: number) => {
    'worklet';
    const rawValue = (percent / 100) * (maxValue - minValue) + minValue;
    if (step >= 1) {
      return Math.round(rawValue);
    }
    return Math.round(rawValue / step) * step;
  };

  const initialPercent = valueToPercent(value);
  const translateX = useSharedValue(initialPercent);
  const displayValue = useSharedValue(value);
  const isDragging = useSharedValue(false);

  React.useEffect(() => {
    if (!isDragging.value) {
      translateX.value = withSpring(valueToPercent(value));
      displayValue.value = value;
    }
  }, [value]);

  const panGestureHandler = useAnimatedGestureHandler({
    onStart: (_, ctx: { startX: number; lastValue: number }) => {
      'worklet';
      ctx.startX = translateX.value;
      ctx.lastValue = displayValue.value;
      runOnJS(Haptics.selectionAsync)();
      isDragging.value = true;
    },
    onActive: (event, ctx) => {
      'worklet';
      const newPercent = Math.min(
        Math.max(ctx.startX + (event.translationX / trackWidth) * 100, 0),
        100,
      );
      translateX.value = newPercent;
      const newValue = percentToValue(newPercent);
      displayValue.value = newValue;

      if (Math.abs(newValue - ctx.lastValue) >= step) {
        runOnJS(Haptics.selectionAsync)();
        ctx.lastValue = newValue;
        if (onChange) runOnJS(onChange)(newValue);
      }
    },
    onEnd: () => {
      'worklet';
      isDragging.value = false;
      const finalValue = percentToValue(translateX.value);
      runOnJS(Haptics.selectionAsync)();
      if (onChangeEnd) runOnJS(onChangeEnd)(finalValue);
    },
  });

  const fillStyle = useAnimatedStyle(() => ({
    width: (translateX.value / 100) * trackWidth + thumbSize,
  }));

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: (translateX.value / 100) * trackWidth }],
  }));

  const labelStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: (translateX.value / 100) * trackWidth }],
  }));

  const animatedTextProps = useAnimatedProps<TextInputProps>(() => {
    'worklet';
    const val = displayValue.value ?? 20;
    const textValue = step < 1 ? val.toFixed(1) : Math.round(val).toString();
    return {
      text: textValue,
      value: textValue,
    };
  });

  const onLayout = React.useCallback((event: any) => {
    const { width } = event.nativeEvent.layout;
    setTrackWidth(width - thumbSize);
  }, []);

  return (
    <View className={`h-14 justify-center ${className}`}>
      {showValue && (
        <Animated.View
          className="absolute left-0 top-[-20px] flex w-[40px] -translate-x-[20px] items-center"
          style={labelStyle}
        >
          <AnimatedTextInput
            className="w-full items-center justify-center rounded-md bg-background-50 px-2 py-0 pb-2 text-center text-sm font-medium leading-5 text-primary-500 shadow-sm"
            animatedProps={animatedTextProps}
            editable={false}
            value={
              step < 1
                ? (value ?? 20).toFixed(1)
                : Math.round(value ?? 20).toString()
            }
          />
        </Animated.View>
      )}
      <View className="flex w-full px-2">
        <View
          className="relative rounded-full bg-background-50"
          style={{ height: trackHeight }}
          onLayout={onLayout}
        >
          <View className="absolute inset-0 overflow-hidden rounded-full">
            <Animated.View
              className="absolute left-0 top-0 h-full rounded-full bg-primary-500"
              style={fillStyle}
            />
          </View>
          <PanGestureHandler onGestureEvent={panGestureHandler}>
            <Animated.View
              className="absolute rounded-full border-[0.5px] border-background-200 bg-background-300 shadow-sm"
              style={[
                {
                  width: thumbSize,
                  height: thumbSize,
                  top: (trackHeight - thumbSize) / 2,
                  left: 0,
                },
                thumbStyle,
              ]}
            />
          </PanGestureHandler>
        </View>
      </View>
    </View>
  );
}
