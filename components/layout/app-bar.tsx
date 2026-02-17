import { Button } from '@/components/ui/button';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import React, { ReactNode, useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import { HStack } from '../ui/hstack';
import { Icon } from '../ui/icon';
import { VStack } from '../ui/vstack';

// Define the allowed sizes based on the linter error
type HeadingSize = 'lg' | 'sm' | 'md' | 'xl' | '2xl' | 'xs' | '3xl' | '4xl' | '5xl' | undefined;
const APP_BAR_HORIZONTAL_PADDING_TOTAL = 40;
const SIDE_SLOT_MIN_WIDTH = 50;
const BACK_BUTTON_RESERVED_WIDTH = 40;
const TITLE_SAFE_GAP = 8;
const MIN_TITLE_WIDTH = 72;
const MAX_TITLE_WIDTH = 480;

interface AppBarProps {
  title: string;
  titleSize?: HeadingSize; // Use the defined HeadingSize type
  subtitle?: string;
  showBack?: boolean;
  centerTitle?: boolean;
  rightElement?: ReactNode;
  centerElement?: ReactNode;
  bottomElement?: ReactNode;
  className?: string;
  showBottomBorder?: boolean;
}

export function AppBar({
  title,
  titleSize = 'lg',
  subtitle,
  showBack,
  centerTitle,
  rightElement,
  centerElement,
  bottomElement,
  className,
  showBottomBorder,
}: AppBarProps) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const leftTitleMaxWidth = useMemo(() => {
    const contentWidth = Math.max(0, width - APP_BAR_HORIZONTAL_PADDING_TOTAL);
    const backButtonWidth = showBack ? BACK_BUTTON_RESERVED_WIDTH : 0;
    const hasCenteredContent = Boolean(centerTitle || centerElement);
    const rawAvailableWidth = hasCenteredContent
      ? contentWidth / 2 - backButtonWidth - TITLE_SAFE_GAP
      : contentWidth - backButtonWidth - SIDE_SLOT_MIN_WIDTH - TITLE_SAFE_GAP;

    return Math.max(MIN_TITLE_WIDTH, Math.min(MAX_TITLE_WIDTH, rawAvailableWidth));
  }, [centerElement, centerTitle, showBack, width]);

  return (
    <View className={`w-full bg-background-0 ${showBottomBorder ? 'border-b border-outline-50' : ''} ${className}`}>
      <VStack space="sm" className="px-5 pb-4 pt-3">
        <HStack className="relative items-center justify-between">
          <HStack className="items-center min-w-[50px]">
            {showBack && (
              <Button variant="link" className="-ml-2 mr-1 h-9 w-9 rounded-xl p-0" onPress={() => router.back()}>
                <Icon as={ChevronLeft} size="xl" className="text-typography-950" />
              </Button>
            )}
            {!centerTitle && (
              <VStack className="shrink" style={{ maxWidth: leftTitleMaxWidth }}>
                <Heading size={titleSize} className="text-typography-950" numberOfLines={1} ellipsizeMode="tail">
                  {title}
                </Heading>
                {subtitle && (
                  <Text className="text-sm text-typography-500" numberOfLines={1} ellipsizeMode="tail">
                    {subtitle}
                  </Text>
                )}
              </VStack>
            )}
          </HStack>
          {centerTitle && (
            <View className="absolute left-0 right-0 items-center pointer-events-none">
              <VStack className="items-center">
                <Heading size={titleSize} className="text-typography-950">
                  {title}
                </Heading>
                {subtitle && <Text className="text-sm text-typography-500">{subtitle}</Text>}
              </VStack>
            </View>
          )}
          {centerElement && <View className="absolute left-0 right-0 items-center">{centerElement}</View>}
          <View className="min-w-[50px]">
            {rightElement}
          </View>
        </HStack>
        {bottomElement}
      </VStack>
    </View>
  );
}
