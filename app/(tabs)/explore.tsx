import { AppBar } from '@/components/layout/app-bar';
import { ScrollView } from '@/components/ui/scroll-view';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import React from 'react';

export default function ExploreScreen() {
  return (
    <View className="flex-1 bg-background-0">
      <AppBar title="Explore" titleSize="xl" />

      <ScrollView className="bg-background-0">
        <View className="p-4">
          <Text className="mb-6 text-typography-500">
            This is the placeholder for the Explore tab.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
