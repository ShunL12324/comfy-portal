import { AppBar } from '@/components/layout/app-bar';
import { Button, ButtonText } from '@/components/ui/button';
import { ScrollView } from '@/components/ui/scroll-view';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import * as Sentry from '@sentry/react-native';
import React from 'react';

export default function ExploreScreen() {
  const testSentry = () => {
    try {
      throw new Error('Sentry test error from Explore tab!');
    } catch (error) {
      console.error('Sentry test error caught:', error);
      // Although caught, Sentry.captureException will still report it
      Sentry.captureException(error);
    }
  };

  return (
    <View className="flex-1 bg-background-0">
      <AppBar title="Explore" titleSize="xl" />

      <ScrollView className="bg-background-0">
        <View className="p-4">
          <Text className="mb-6 text-typography-500">
            This is the placeholder for the Explore tab.
          </Text>

          <Button onPress={testSentry} variant="solid" action="negative">
            <ButtonText>Test Sentry Crash Report</ButtonText>
          </Button>
        </View>
      </ScrollView>
    </View>
  );
} 