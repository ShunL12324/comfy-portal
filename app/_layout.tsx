import '@/shims/crypto-random-uuid';
import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import { Colors } from '@/constants/Colors';
import '@/global.css';
import { useResolvedTheme, useThemeStore } from '@/store/theme';
import { useServersStore } from '@/features/server/stores/server-store';
import { useQuickActionStore } from '@/features/quick-action/stores/quick-action-store';
import { useWorkflowStore } from '@/features/workflow/stores/workflow-store';
import { toastConfig, showToast } from '@/utils/toast';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter } from 'expo-router';
import { useIncomingShare } from 'expo-sharing';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import {
  configureReanimatedLogger,
  ReanimatedLogLevel,
} from 'react-native-reanimated';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: 'https://98d5701ad9a66997c72863211e66306a@o4509226334683136.ingest.us.sentry.io/4510933704048640',
  sendDefaultPii: false,
  enableLogs: true,

  // Session Replay — record 10% of sessions, 100% on error
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1,
  integrations: [Sentry.mobileReplayIntegration()],
});

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

// disable reanimated logger
configureReanimatedLogger({
  level: ReanimatedLogLevel.warn,
  strict: false, // Reanimated runs in strict mode by default
});

const CustomDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: Colors.dark.background[0],
  },
};

const CustomLightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: Colors.light.background[0],
  },
};

function RootLayoutNav() {
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  const insets = useSafeAreaInsets();
  const preference = useThemeStore((s) => s.preference);
  const colorScheme = useResolvedTheme();
  const router = useRouter();
  const { resolvedSharedPayloads, clearSharedPayloads, isResolving } = useIncomingShare();

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  // Handle incoming shared images
  useEffect(() => {
    if (isResolving || resolvedSharedPayloads.length === 0) return;

    const payload = resolvedSharedPayloads[0];

    if (payload.contentType !== 'image' || !payload.contentUri) {
      clearSharedPayloads();
      return;
    }

    const actions = useQuickActionStore.getState().actions;

    if (actions.length === 0) {
      showToast.error('No Quick Actions configured', 'Create one from a Load Image node first', insets.top + 8);
      clearSharedPayloads();
      return;
    }

    // TODO: When multiple Quick Actions exist, show a picker instead of using the first one
    // Validate that the target server and workflow still exist
    const servers = useServersStore.getState().servers;
    const workflows = useWorkflowStore.getState().workflow;
    const validAction = actions.find(
      (a) => servers.some((s) => s.id === a.serverId) && workflows.some((w) => w.id === a.workflowId),
    );

    if (!validAction) {
      showToast.error('Quick Action target no longer exists', 'Please reconfigure from a Load Image node', insets.top + 8);
      clearSharedPayloads();
      return;
    }

    const action = validAction;
    // Clear stack to avoid piling up routes on repeated shares
    if (router.canDismiss()) {
      router.dismissAll();
    }
    router.push({
      pathname: '/workflow/[serverId]/run/[workflowId]',
      params: {
        serverId: action.serverId,
        workflowId: action.workflowId,
        sharedImageUri: payload.contentUri,
        targetNodeId: action.targetNodeId,
      },
    });
    clearSharedPayloads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isResolving, resolvedSharedPayloads]);

  if (!loaded) {
    return null;
  }

  return (
    <>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <KeyboardProvider>
        <GluestackUIProvider mode={preference}>
          <ThemeProvider value={colorScheme === 'dark' ? CustomDarkTheme : CustomLightTheme}>
              <BottomSheetModalProvider>
                <Stack
                  screenOptions={{
                    headerShown: false,
                  }}
                >
                  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                  <Stack.Screen
                    name="+not-found"
                    options={{ headerShown: false }}
                  />
                </Stack>
              </BottomSheetModalProvider>

              <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
          </ThemeProvider>
        </GluestackUIProvider>
        </KeyboardProvider>
      </GestureHandlerRootView>
      <Toast config={toastConfig} topOffset={insets.top + 8} />
    </>
  );
}

export default Sentry.wrap(RootLayoutNav);
