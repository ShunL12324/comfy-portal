import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { Bot, SlidersHorizontal } from 'lucide-react-native';
import React, { memo, useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

interface SheetTabToggleProps {
  index: number;
  onChange: (index: number) => void;
}

const TOGGLE_CONTAINER_WIDTH = 112;
const TOGGLE_CONTAINER_HEIGHT = 40;
const TOGGLE_HORIZONTAL_PADDING = 4;
const TOGGLE_ITEM_COUNT = 2;
const TOGGLE_THUMB_WIDTH = (TOGGLE_CONTAINER_WIDTH - TOGGLE_HORIZONTAL_PADDING * 2) / TOGGLE_ITEM_COUNT;
const TOGGLE_THUMB_HEIGHT = TOGGLE_CONTAINER_HEIGHT - TOGGLE_HORIZONTAL_PADDING * 2;
const TOGGLE_ANIMATION_STEP = TOGGLE_THUMB_WIDTH;

export const SheetTabToggle = memo(({ index, onChange }: SheetTabToggleProps) => {
  const togglePosition = useSharedValue(index === 0 ? 0 : 1);

  useEffect(() => {
    togglePosition.value = withTiming(index === 0 ? 0 : 1, {
      duration: 180,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
    });
  }, [index, togglePosition]);

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: togglePosition.value * TOGGLE_ANIMATION_STEP }],
  }));

  return (
    <View
      className="relative rounded-full bg-background-50 p-1"
      style={{ width: TOGGLE_CONTAINER_WIDTH, height: TOGGLE_CONTAINER_HEIGHT }}
    >
      <Animated.View
        className="absolute left-1 top-1 rounded-full bg-primary-500"
        style={[{ width: TOGGLE_THUMB_WIDTH, height: TOGGLE_THUMB_HEIGHT }, thumbStyle]}
      />
      <HStack className="h-8">
        <Pressable
          onPress={() => onChange(0)}
          accessibilityLabel="Switch to nodes"
          className="h-8 items-center justify-center rounded-full"
          style={{ width: TOGGLE_THUMB_WIDTH }}
        >
          <Icon as={SlidersHorizontal} size="sm" className={index === 0 ? 'text-typography-0' : 'text-typography-500'} />
        </Pressable>
        <Pressable
          onPress={() => onChange(1)}
          accessibilityLabel="Switch to AI assistant"
          className="h-8 items-center justify-center rounded-full"
          style={{ width: TOGGLE_THUMB_WIDTH }}
        >
          <Icon as={Bot} size="sm" className={index === 1 ? 'text-typography-0' : 'text-typography-500'} />
        </Pressable>
      </HStack>
    </View>
  );
});

SheetTabToggle.displayName = 'SheetTabToggle';
