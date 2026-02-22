import { useResolvedTheme } from '@/store/theme';
import * as Haptics from 'expo-haptics';
import { Minus, Plus } from 'lucide-react-native';
import { MotiView } from 'moti';
import React, { useCallback, useEffect, useState } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { Icon } from '../ui/icon';
import { Input, InputField } from '../ui/input';

interface NumberInputProps {
  /** Current value of the input (optional if defaultValue is provided) */
  value?: number;
  /** Default value of the input (used if value is not provided) */
  defaultValue?: number;
  /** Minimum value allowed (default: -Infinity) */
  minValue?: number;
  /** Maximum value allowed (default: Infinity) */
  maxValue?: number;
  /** Step size for increment/decrement (default: 1) */
  step?: number;
  /** Callback fired when the value changes */
  onChange?: (value: number) => void;
  /** Additional className for styling */
  className?: string;
  /** Number of decimal places to display */
  decimalPlaces?: number;
  /** Size of the +/- buttons in pixels (default: 24) */
  buttonSize?: number;
  /** Space between elements in pixels (default: 12) */
  space?: number;
}

const styles = {
  container: 'flex-row items-center',
  button: {
    base: 'items-center justify-center rounded-lg bg-background-200',
    disabled: 'opacity-50',
  },
  icon: 'text-typography-400',
  input: 'text-center border-0 overflow-hidden items-center justify-center',
  inputContainer: 'min-w-[80px] max-w-[160px] overflow-hidden items-center justify-center',
} as const;

export function NumberInput({
  value,
  defaultValue = 0,
  minValue = -Infinity,
  maxValue = Infinity,
  step = 1,
  onChange,
  className = '',
  decimalPlaces = 0,
  buttonSize = 24,
  space = 12,
}: NumberInputProps) {
  const initialWidth = 74;
  const [localValue, setLocalValue] = useState((value ?? defaultValue).toString());
  const [inputWidth, setInputWidth] = useState(initialWidth);
  const theme = useResolvedTheme();

  useEffect(() => {
    if (value !== undefined) {
      const formattedValue = value.toFixed(decimalPlaces);
      setLocalValue(formattedValue);
      setInputWidth(calculateTextWidth(formattedValue));
    }
  }, [value, decimalPlaces]);

  const handleHapticFeedback = useCallback(() => {
    Haptics.selectionAsync();
  }, []);

  const adjustValue = useCallback(
    (delta: number) => {
      const currentValue = Number(localValue);
      if (isNaN(currentValue)) return;

      const newValue = Math.min(Math.max(currentValue + delta, minValue), maxValue);
      const formattedValue = newValue.toFixed(decimalPlaces);
      setLocalValue(formattedValue);
      setInputWidth(calculateTextWidth(formattedValue));
      onChange?.(Number(formattedValue));
      handleHapticFeedback();
    },
    [localValue, minValue, maxValue, decimalPlaces, onChange],
  );

  const calculateTextWidth = (text: string) => {
    return Math.min(160, Math.max(80, text.length * 10 + 24));
  };

  const handleInputChange = (text: string) => {
    // Allow minus sign and decimal point
    if (text === '-' || text === '.' || text === '-.') {
      setLocalValue(text);
      return;
    }

    const numValue = Number(text);

    // Skip update if not a valid number
    if (isNaN(numValue)) {
      return;
    }

    // Check if out of range
    if (numValue > maxValue) {
      const formattedValue = maxValue.toFixed(decimalPlaces);
      setLocalValue(formattedValue);
      setInputWidth(calculateTextWidth(formattedValue));
      onChange?.(maxValue);
      return;
    }

    if (numValue < minValue) {
      const formattedValue = minValue.toFixed(decimalPlaces);
      setLocalValue(formattedValue);
      setInputWidth(calculateTextWidth(formattedValue));
      onChange?.(minValue);
      return;
    }

    // Value is within range, update normally
    setLocalValue(text);
    setInputWidth(calculateTextWidth(text));
    onChange?.(numValue);
  };

  const handleInputBlur = () => {
    let numValue = Number(localValue);
    if (isNaN(numValue)) {
      numValue = value ?? defaultValue;
    }
    numValue = Math.min(Math.max(numValue, minValue), maxValue);
    const formattedValue = numValue.toFixed(decimalPlaces);
    setLocalValue(formattedValue);
    setInputWidth(calculateTextWidth(formattedValue));
    onChange?.(numValue);
  };

  return (
    <View className={`${styles.container} ${className}`}>
      <TouchableOpacity
        onPress={() => adjustValue(-step)}
        disabled={Number(localValue) <= minValue}
        className={Number(localValue) <= minValue ? styles.button.disabled : undefined}
        style={{ marginRight: space }}
      >
        <View className={styles.button.base} style={{ width: buttonSize, height: buttonSize }}>
          <Icon as={Minus} size="sm" className={styles.icon} />
        </View>
      </TouchableOpacity>

      <MotiView
        className={styles.inputContainer}
        animate={{
          width: inputWidth,
        }}
        transition={{
          type: 'spring',
          damping: 20,
          mass: 0.7,
        }}
      >
        <Input variant="outline" className={`${styles.input} border-0`}>
          <InputField
            keyboardType="numeric"
            value={localValue}
            onChangeText={handleInputChange}
            onBlur={handleInputBlur}
            numberOfLines={1}
            textAlign="center"
          />
        </Input>
      </MotiView>

      <TouchableOpacity
        onPress={() => adjustValue(step)}
        disabled={Number(localValue) >= maxValue}
        className={Number(localValue) >= maxValue ? styles.button.disabled : undefined}
        style={{ marginLeft: space }}
      >
        <View className={styles.button.base} style={{ width: buttonSize, height: buttonSize }}>
          <Icon as={Plus} size="sm" className={styles.icon} />
        </View>
      </TouchableOpacity>
    </View>
  );
}
