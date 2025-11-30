import { Colors } from '@/constants/Colors';
import { useThemeStore } from '@/store/theme';
import { Stack } from 'expo-router';

export default function WorkflowsLayout() {
  const { theme } = useThemeStore();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: {
          backgroundColor: theme === 'light' ? Colors.light.background[0] : Colors.dark.background[0],
        },
      }}
    />
  );
}
