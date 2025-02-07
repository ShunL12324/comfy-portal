import { AppBar } from '@/components/layout/app-bar';
import { Stack } from 'expo-router';

export default function LegalLayout() {
  return (
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
  );
}
