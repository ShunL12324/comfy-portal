import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { useThemeStore } from '@/store/theme';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import React, { ReactNode } from 'react';
import { HStack } from '../ui/hstack';
import { Icon } from '../ui/icon';
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
              <Button variant="link" className="-ml-2 mr-1 h-9 w-9 rounded-xl p-0" onPress={() => router.back()}>
                <Icon as={ChevronLeft} size="xl" className="text-typography-950" />
              </Button>
            )}
            <VStack>
              <Text className="max-w-24 truncate text-lg font-semibold text-typography-950" numberOfLines={1}>
                {title}
              </Text>
              {subtitle && <Text className="text-sm text-typography-500">{subtitle}</Text>}
            </VStack>
          </HStack>
          {centerElement && <View className="absolute left-0 right-0 items-center">{centerElement}</View>}
          {rightElement && <View className="">{rightElement}</View>}
        </HStack>
        {bottomElement}
      </VStack>
    </View>
  );
}
