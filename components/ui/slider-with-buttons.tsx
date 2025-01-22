import React from 'react';
import { HStack } from './hstack';
import { Button } from './button';
import { Icon } from './icon';
import { Minus, Plus } from 'lucide-react-native';
import { Slider } from './slider';
import { Text } from './text';

interface SliderWithButtonsProps {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  label?: string;
}

export const SliderWithButtons = ({
  value,
  onChange,
  min,
  max,
  step = 1,
  label,
}: SliderWithButtonsProps) => {
  const handleIncrement = () => {
    const newValue = Math.min(value + step, max);
    onChange(newValue);
  };

  const handleDecrement = () => {
    const newValue = Math.max(value - step, min);
    onChange(newValue);
  };

  return (
    <HStack space="sm" className="items-center">
      <Button
        variant="outline"
        className="h-8 w-8 rounded-xl bg-background-50 p-0"
        onPress={handleDecrement}
      >
        <Icon as={Minus} size="sm" className="text-primary-500" />
      </Button>
      <HStack className="flex-1 items-center" space="sm">
        <Slider
          value={value}
          minValue={min}
          maxValue={max}
          step={step}
          onChange={onChange}
          className="flex-1"
        />
        {label && (
          <Text className="min-w-[40px] text-right text-xs text-primary-400">
            {label}
          </Text>
        )}
      </HStack>
      <Button
        variant="outline"
        className="h-8 w-8 rounded-xl bg-background-50 p-0"
        onPress={handleIncrement}
      >
        <Icon as={Plus} size="sm" className="text-primary-500" />
      </Button>
    </HStack>
  );
};
