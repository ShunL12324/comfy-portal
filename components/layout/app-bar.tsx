import React from 'react';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { Text } from '@/components/ui/text';
import { Pressable } from '@/components/ui/pressable';
import { Icon } from '@/components/ui/icon';
import { MotiView } from 'moti';
import { ArrowLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';

interface AppBarProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  rightElement?: React.ReactNode;
}

export const AppBar = ({
  title,
  subtitle,
  showBack,
  rightElement,
}: AppBarProps) => {
  const router = useRouter();

  return (
    <MotiView
      className="absolute left-0 right-0 top-0 z-10 bg-background-0"
      from={{ opacity: 0, translateY: -5 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 200 }}
    >
      <VStack className="px-5 py-3">
        <HStack className="items-center justify-between">
          <HStack space="md" className="flex-1 items-center">
            {showBack && (
              <Pressable
                onPress={() => router.back()}
                className="h-9 w-9 items-center justify-center rounded-xl bg-background-50 active:bg-background-100"
              >
                <Icon as={ArrowLeft} size="md" className="text-primary-500" />
              </Pressable>
            )}
            <VStack space="xs">
              {title && (
                <Text
                  className="text-lg font-semibold text-primary-500"
                  numberOfLines={1}
                >
                  {title}
                </Text>
              )}
              {subtitle && (
                <Text className="text-sm text-primary-300" numberOfLines={1}>
                  {subtitle}
                </Text>
              )}
            </VStack>
          </HStack>
          {rightElement}
        </HStack>
      </VStack>
    </MotiView>
  );
};
