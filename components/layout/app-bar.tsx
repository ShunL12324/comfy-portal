import React, { ReactNode } from 'react';
import { View } from '@/components/ui/view';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { VStack } from '../ui/vstack';
import { HStack } from '../ui/hstack';

interface AppBarProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  rightElement?: ReactNode;
  centerElement?: ReactNode;
  bottomElement?: ReactNode;
}

export function AppBar({
  title,
  subtitle,
  showBack,
  rightElement,
  centerElement,
  bottomElement,
}: AppBarProps) {
  const router = useRouter();

  return (
    <View className="w-full bg-background-0">
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
