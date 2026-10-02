import { DesignScope } from '@/components/ui/design-system/primitives';
import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import { designColors } from '@/constants/design-tokens';
import { useLaunchPoller } from '@/features/cloud/hooks/use-launch-poller';
import { reconcileAll, watchAppState } from '@/features/generation/services/job-recovery';
import { useQuickActionStore } from '@/features/quick-action/stores/quick-action-store';
import { useServersStore } from '@/features/server/stores/server-store';
import { runStorageMigrations } from '@/services/storage-migration';
import { useWorkflowStore } from '@/features/workflow/stores/workflow-store';
import '../../global.css';
import { useIncomingShare } from '@/hooks/use-incoming-share';
import '@/shims/ai-sdk-streams';
import '@/shims/crypto-random-uuid';
import { useResolvedTheme, useThemeStore } from '@/store/theme';
import { showToast, AppToast } from '@/utils/toast';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import * as Sentry from '@sentry/react-native';
import { useFonts } from 'expo-font';
import { fontAssets } from '@/constants/font-assets';
import { Stack, useRouter } from 'expo-router';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router/react-navigation';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { configureReanimatedLogger, ReanimatedLogLevel } from 'react-native-reanimated';

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
    background: designColors.dark.paper,
    card: designColors.dark.paper,
  },
};

const CustomLightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: designColors.light.paper,
    card: designColors.light.paper,
  },
};

function RootLayoutNav() {
  // One family: IBM Plex Sans for titles, prose, controls and numeric readouts.
  const [loaded] = useFonts(fontAssets);

  const preference = useThemeStore((s) => s.preference);
  const colorScheme = useResolvedTheme();
  const router = useRouter();
  const { resolvedSharedPayloads, clearSharedPayloads, isResolving } = useIncomingShare();

  // Not the launch screen's job: a cloud install runs for tens of minutes and
  // bills throughout, so it has to keep progressing with nobody watching — and
  // on a cold start this is what reattaches to one left running.
  useLaunchPoller();

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  // Generations outlive the run screen, and the server buffers nothing for a
  // disconnected client. Coming back to the foreground is the moment to ask
  // what finished while we were away and pull those results down.
  useEffect(() => {
    // Started here rather than waited on: the gallery renders from the store
    // and fills in as assets are indexed. `reconcileAll` awaits the same pass
    // internally, so ordering does not depend on this line.
    void runStorageMigrations();
    void reconcileAll();

    return watchAppState();
  }, []);

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
      showToast.error('No Quick Actions configured', 'Create one from a Load Image node first');
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
      showToast.error('Quick Action target no longer exists', 'Please reconfigure from a Load Image node');
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
            <DesignScope mode={colorScheme === 'dark' ? 'dark' : 'light'}>
              <ThemeProvider value={colorScheme === 'dark' ? CustomDarkTheme : CustomLightTheme}>
                <BottomSheetModalProvider>
                  <Stack
                    screenOptions={{
                      headerShown: false,
                    }}
                  >
                    <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                    <Stack.Screen name="+not-found" options={{ headerShown: false }} />
                  </Stack>
                </BottomSheetModalProvider>

                <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
              </ThemeProvider>
            </DesignScope>
          </GluestackUIProvider>
        </KeyboardProvider>
      </GestureHandlerRootView>
      <AppToast />
    </>
  );
}

export default Sentry.wrap(RootLayoutNav);
