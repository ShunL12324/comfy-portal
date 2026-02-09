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
  /** 小数位数（默认自动根据step计算） */
  decimalPlaces?: number;
  /** Thumb size in pixels (default: 32) */
  thumbSize?: number;
  /** Space between elements in pixels (default: 16) */
  space?: number;
}

// Optimize styles with animated components
const styles = {
  container: 'flex-row items-center',
  button: {
    base: 'items-center justify-center rounded-lg bg-background-200',
    disabled: 'opacity-50',
  },
  icon: 'text-typography-400',
  sliderContainer: 'flex-1',
  value: 'min-w-[48px] h-8 rounded-lg bg-background-100 items-center justify-center mr-4',
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
      Haptics.selectionAsync();
    },
    [localValue, minValue, maxValue, precision, onChange],
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
    <View className="flex-1">
      <View className={styles.container}>
        <View className={styles.value}>
          <Text size="sm" bold className="text-typography-900">
            {formatValue(localValue)}
          </Text>
        </View>

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
            minimumTrackTintColor={colors.primary[500]}
            maximumTrackTintColor={colors.background[200]}
            thumbTintColor={colors.primary[400]}
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
      </View>
    </View>
  );
}
