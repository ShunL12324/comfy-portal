import { Colors } from '@/constants/Colors';
import { designTokens as t } from '@/constants/design-tokens';
import { Platform } from 'react-native';
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
      >
        <Stack.Screen
          name="run/history"
          options={{
            presentation: Platform.OS === 'ios' ? 'formSheet' : 'modal',
            sheetCornerRadius: t.radius.sheet,
            animation: 'slide_from_bottom',
          }}
        />
      </Stack>
    </SafeAreaView>
  );
}
