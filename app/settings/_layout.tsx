import { View } from '@/components/ui/view';
import { Stack } from 'expo-router';

export default function SettingsLayout() {
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
