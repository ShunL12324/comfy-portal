import { Button } from '@/components/ui/button';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { useThemeStore } from '@/store/theme';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import React, { ReactNode } from 'react';
import { HStack } from '../ui/hstack';
import { Icon } from '../ui/icon';
import { VStack } from '../ui/vstack';

// Define the allowed sizes based on the linter error
type HeadingSize = 'lg' | 'sm' | 'md' | 'xl' | '2xl' | 'xs' | '3xl' | '4xl' | '5xl' | undefined;

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
}: AppBarProps) {
  const router = useRouter();
  const { theme } = useThemeStore();

  return (
    <View className={`w-full bg-background-0 ${className}`}>
      <VStack space="sm" className="px-5 pb-4 pt-3">
        <HStack className="relative items-center justify-between">
          <HStack className="items-center" style={{ minWidth: 50 }}>
            {showBack && (
              <Button variant="link" className="-ml-2 mr-1 h-9 w-9 rounded-xl p-0" onPress={() => router.back()}>
                <Icon as={ChevronLeft} size="xl" className="text-typography-950" />
              </Button>
            )}
            {!centerTitle && (
              <VStack className="max-w-[100px]">
                <Heading size={titleSize} className="text-typography-950" numberOfLines={1} ellipsizeMode="tail">
                  {title}
                </Heading>
                {subtitle && <Text className="text-sm text-typography-500" numberOfLines={1}>{subtitle}</Text>}
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
          <View style={{ minWidth: 50 }}>
            {rightElement}
          </View>
        </HStack>
        {bottomElement}
      </VStack>
    </View>
  );
}
