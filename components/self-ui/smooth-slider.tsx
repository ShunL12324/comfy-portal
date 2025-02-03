import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { Colors } from '@/constants/Colors';
import { useThemeStore } from '@/store/theme';
import Slider from '@react-native-community/slider';
import * as Haptics from 'expo-haptics';
import { Minus, Plus } from 'lucide-react-native';
import React, { useCallback } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { useSharedValue, withSpring } from 'react-native-reanimated';
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
  showButtons = true,
  decimalPlaces,
}: SmoothSliderProps) {
  const animatedValue = useSharedValue(value);
  const { theme } = useThemeStore();

  const adjustValue = useCallback(
    (delta: number) => {
      // 优先使用传入的小数位数参数，否则自动计算
      const precision =
        decimalPlaces ?? (step.toString().split('.')[1] || '').length;
      const newValue = Number(
        Math.min(Math.max(value + delta, minValue), maxValue).toFixed(
          precision,
        ),
      );
      if (newValue !== value) {
        animatedValue.value = withSpring(newValue);
        onChange?.(newValue);
        onChangeEnd?.(newValue);
        Haptics.selectionAsync();
      }
    },
    [
      value,
      minValue,
      maxValue,
      onChange,
      onChangeEnd,
      animatedValue,
      step,
      decimalPlaces,
    ],
  );

  return (
    <VStack space="sm" className={className}>
      <HStack className="items-center" space="md">
        {showButtons && (
          <TouchableOpacity
            onPress={() => adjustValue(-step)}
            disabled={value <= minValue}
            className={`p-1 ${value <= minValue ? 'opacity-50' : ''}`}
          >
            <View className="h-6 w-6 items-center justify-center rounded-lg bg-background-200">
              <Icon as={Minus} size="xs" className="text-typography-400" />
            </View>
          </TouchableOpacity>
        )}

        <View className="flex-1">
          <Slider
            value={value}
            minimumValue={minValue}
            maximumValue={maxValue}
            step={step}
            onValueChange={(val) => {
              const precision =
                decimalPlaces ?? (step.toString().split('.')[1] || '').length;
              const fixedVal = Number(val.toFixed(precision));
              animatedValue.value = fixedVal;
              onChange?.(fixedVal);
            }}
            onSlidingComplete={(val) => {
              Haptics.selectionAsync();
              onChangeEnd?.(val);
            }}
            minimumTrackTintColor={
              theme === 'light'
                ? Colors.light.background[600]
                : Colors.dark.background[600]
            }
            maximumTrackTintColor={
              theme === 'light'
                ? Colors.light.background[100]
                : Colors.dark.background[100]
            }
            thumbTintColor={
              theme === 'light'
                ? Colors.light.primary[400]
                : Colors.dark.primary[400]
            }
            style={{ height: 40 }}
          />
        </View>

        {showButtons && (
          <TouchableOpacity
            onPress={() => adjustValue(step)}
            disabled={value >= maxValue}
            className={`p-1 ${value >= maxValue ? 'opacity-50' : ''}`}
          >
            <View className="h-6 w-6 items-center justify-center rounded-lg bg-background-200">
              <Icon as={Plus} size="xs" className="text-typography-400" />
            </View>
          </TouchableOpacity>
        )}
      </HStack>
    </VStack>
  );
}
