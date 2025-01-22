import React from 'react';
import { HStack } from './hstack';
import { Pressable } from './pressable';
import { Text } from './text';

interface SegmentedControlProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
}

export const SegmentedControl = ({
  options,
  value,
  onChange,
}: SegmentedControlProps) => {
  return (
    <HStack className="overflow-hidden rounded-xl bg-background-50 p-1">
      {options.map((option) => (
        <Pressable
          key={option}
          className={`flex-1 items-center justify-center rounded-lg py-2 ${
            value === option
              ? 'bg-background-0'
              : 'bg-transparent active:bg-background-0/50'
          }`}
          onPress={() => onChange(option)}
        >
          <Text
            className={`text-xs font-medium ${
              value === option ? 'text-primary-500' : 'text-primary-300'
            }`}
          >
            {option}
          </Text>
        </Pressable>
      ))}
    </HStack>
  );
};
