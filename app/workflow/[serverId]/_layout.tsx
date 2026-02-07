import { Colors } from '@/constants/Colors';
import { useResolvedTheme } from '@/store/theme';
import { Stack } from 'expo-router';

export default function WorkflowsLayout() {
  const theme = useResolvedTheme();

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
