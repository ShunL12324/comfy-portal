import React from 'react';
import { HStack } from './hstack';
import { Pressable } from './pressable';
import { Text } from './text';

interface TabControlProps {
  tabs: string[];
  value: string;
  onChange: (value: string) => void;
}

export const TabControl = ({ tabs, value, onChange }: TabControlProps) => {
  return (
    <HStack className="border-background-12 h-12 items-center border-b-[0.5px]">
      {tabs.map((tab) => (
        <Pressable
          key={tab}
          className="px-4 py-2"
          onPress={() => onChange(tab)}
        >
          <Text
            className={`text-sm font-medium ${
              value === tab ? 'text-primary-500' : 'text-primary-300'
            }`}
          >
            {tab}
          </Text>
          {value === tab && (
            <HStack className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary-500" />
          )}
        </Pressable>
      ))}
    </HStack>
  );
};
