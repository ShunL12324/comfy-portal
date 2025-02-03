import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { useThemeStore } from '@/store/theme';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import React, { ReactNode } from 'react';
import { HStack } from '../ui/hstack';
import { VStack } from '../ui/vstack';

interface AppBarProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  rightElement?: ReactNode;
  centerElement?: ReactNode;
  bottomElement?: ReactNode;
  className?: string;
}

export function AppBar({
  title,
  subtitle,
  showBack,
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
        <HStack className="items-center justify-between">
          <HStack className="items-center">
            {showBack && (
              <Button
                variant="link"
                className="-ml-2 mr-1 h-9 w-9 rounded-xl p-0"
                onPress={() => router.back()}
              >
                <ChevronLeft size={24} className="text-primary-500" />
              </Button>
            )}
            <VStack>
              <Text className="text-lg font-semibold text-primary-500">
                {title}
              </Text>
              {subtitle && (
                <Text className="text-sm text-primary-300">{subtitle}</Text>
              )}
            </VStack>
          </HStack>
          {centerElement && (
            <View className="absolute left-0 right-0 items-center">
              {centerElement}
            </View>
          )}
          {rightElement && <View className="z-10">{rightElement}</View>}
        </HStack>
        {bottomElement}
      </VStack>
    </View>
  );
}
