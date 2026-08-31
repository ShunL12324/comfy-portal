import { Colors } from '@/constants/Colors';
import { useResolvedTheme } from '@/store/theme';
import RNSlider from '@react-native-community/slider';
import * as Haptics from 'expo-haptics';
import { Minus, Plus } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Icon } from '../ui/icon';
import { Text } from '../ui/text';

/**
 * Props for the SmoothSlider component
 * @interface CustomSliderProps
 */
interface CustomSliderProps {
  /** Current value of the slider (optional if defaultValue is provided) */
  value?: number;
  /** Initial value of the slider (used if value is not provided) */
  defaultValue?: number;
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
  /** Whether to show the buttons (default: true) */
  showButtons?: boolean;
  /** Decimal places (auto-calculated from step by default) */
  decimalPlaces?: number;
  /** Thumb size in pixels (default: 32) */
  thumbSize?: number;
  /** Space between elements in pixels (default: 16) */
  space?: number;
}

// Optimize styles with animated components
const styles = {
  container: 'flex-row items-center',
  // Bare icon buttons rather than filled tiles. The sheet's slider is track
  // plus readout and nothing else; these stay because dragging alone is a
  // poor way to nudge a value by one on a touch screen, but they shouldn't
  // read as two objects floating either side of the track.
  button: {
    base: 'items-center justify-center rounded-md',
    disabled: 'opacity-40',
  },
  icon: 'text-content-tertiary',
  sliderContainer: 'flex-1',
  // Right-aligned, no chip: the readout is one of the screen's numbers, and
  // fixed decimals keep the digits from jittering as the thumb moves.
  value: 'min-w-[52px] items-end justify-center ml-4',
} as const;

const sliderStyles = StyleSheet.create({
  slider: {
    flex: 1,
  },
  thumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#6366F1',
  },
});

/**
 * A smooth, animated slider component with haptic feedback
 */
export function NumberSlider({
  value: controlledValue,
  defaultValue = 0,
  minValue = 0,
  maxValue = 100,
  step = 1,
  onChange,
  onChangeEnd,
  showButtons = true,
  decimalPlaces,
  thumbSize = 24,
  space = 24,
}: CustomSliderProps) {
  const [localValue, setLocalValue] = useState(() => {
    const initial = controlledValue ?? defaultValue ?? 0;
    return typeof initial === 'number' && !isNaN(initial) ? initial : 0;
  });
  const theme = useResolvedTheme();
  const colors = Colors[theme === 'dark' ? 'dark' : 'light'];

  // Sync external controlled value to internal state
  useEffect(() => {
    if (controlledValue !== undefined) {
      const num = typeof controlledValue === 'number' && !isNaN(controlledValue) ? controlledValue : 0;
      setLocalValue(num);
    }
  }, [controlledValue]);

  const precision = useCallback(() => {
    return decimalPlaces ?? (step.toString().split('.')[1] || '').length;
  }, [decimalPlaces, step]);

  const formatValue = useCallback(
    (val: number) => {
      const num = typeof val === 'number' && !isNaN(val) ? val : 0;
      return num.toFixed(precision());
    },
    [precision],
  );

  const adjustValue = useCallback(
    (delta: number) => {
      const newValue = Number(Math.min(Math.max(localValue + delta, minValue), maxValue).toFixed(precision()));
      setLocalValue(newValue);
      if (onChange) {
        onChange(newValue);
      }
      if (onChangeEnd) {
        onChangeEnd(newValue);
      }
      Haptics.selectionAsync();
    },
    [localValue, minValue, maxValue, precision, onChange, onChangeEnd],
  );

  const handleChange = useCallback(
    (newValue: number) => {
      setLocalValue(newValue);
      if (onChange) {
        onChange(newValue);
      }
    },
    [onChange],
  );

  const handleComplete = useCallback(
    (newValue: number) => {
      if (onChangeEnd) {
        onChangeEnd(newValue);
      }
      Haptics.selectionAsync();
    },
    [onChangeEnd],
  );

  return (
    <View className="w-full">
      <View className={styles.container}>
        {showButtons && (
          <TouchableOpacity
            onPress={() => adjustValue(-step)}
            disabled={localValue <= minValue}
            className={localValue <= minValue ? styles.button.disabled : undefined}
            style={{ marginRight: space }}
          >
            <View className={styles.button.base} style={{ width: thumbSize, height: thumbSize }}>
              <Icon as={Minus} size="sm" className={styles.icon} />
            </View>
          </TouchableOpacity>
        )}

        <View className={styles.sliderContainer}>
          <RNSlider
            style={[sliderStyles.slider]}
            value={localValue}
            minimumValue={minValue}
            maximumValue={maxValue}
            step={step}
            onValueChange={handleChange}
            onSlidingComplete={handleComplete}
            minimumTrackTintColor={colors.typography[950]}
            maximumTrackTintColor={colors.background[200]}
            thumbTintColor={colors.typography[950]}
          />
        </View>

        {showButtons && (
          <TouchableOpacity
            onPress={() => adjustValue(step)}
            disabled={localValue >= maxValue}
            className={localValue >= maxValue ? styles.button.disabled : undefined}
            style={{ marginLeft: space }}
          >
            <View className={styles.button.base} style={{ width: thumbSize, height: thumbSize }}>
              <Icon as={Plus} size="sm" className={styles.icon} />
            </View>
          </TouchableOpacity>
        )}

        <View className={styles.value}>
          <Text size="sm" className="font-mono text-content-body">
            {formatValue(localValue)}
          </Text>
        </View>
      </View>
    </View>
  );
}
