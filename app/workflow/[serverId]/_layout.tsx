import { Colors } from '@/constants/Colors';
import { useResolvedTheme } from '@/store/theme';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function WorkflowsLayout() {
  const theme = useResolvedTheme();

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: {
            backgroundColor: theme === 'light' ? Colors.light.background[0] : Colors.dark.background[0],
          },
        }}
      />
    </SafeAreaView>
  );
}
