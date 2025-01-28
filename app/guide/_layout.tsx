import { Stack } from 'expo-router';
import { View } from '@/components/ui/view';

export default function GuideLayout() {
  return (
    <View className="flex-1 bg-background-0">
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: 'transparent' },
        }}
      />
    </View>
  );
}
