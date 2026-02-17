import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function GuideLayout() {
  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: 'transparent' },
        }}
      />
    </SafeAreaView>
  );
}
