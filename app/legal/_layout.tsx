import { AppBar } from '@/components/layout/app-bar';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LegalLayout() {
  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <Stack>
        <Stack.Screen
          name="privacy"
          options={{
            header: () => <AppBar title="Privacy Policy" showBack />,
          }}
        />
        <Stack.Screen
          name="terms"
          options={{
            header: () => <AppBar title="Terms of Service" showBack />,
          }}
        />
      </Stack>
    </SafeAreaView>
  );
}
