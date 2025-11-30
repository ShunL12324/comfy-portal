import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import { Colors } from '@/constants/Colors';
import '@/global.css';
import { useThemeStore } from '@/store/theme';
import { toastConfig } from '@/utils/toast';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import {
  configureReanimatedLogger,
  ReanimatedLogLevel,
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

// Initialize Sentry
// Initialize Sentry
// Sentry.init({
//   dsn: 'https://bd0ec56053142b228f923f7e2258e0dc@o4509226334683136.ingest.us.sentry.io/4509226336780288',
//   // Set tracesSampleRate to 1.0 to capture 100%
//   // of transactions for performance monitoring.
//   // We recommend adjusting this value in production
//   tracesSampleRate: 0.01,
//   _experiments: {
//     // profilesSampleRate is relative to tracesSampleRate.
//     // Here, we'll capture profiles for 100% of transactions.
//     profilesSampleRate: 0,
//   },
//   // Session Replay
//   replaysSessionSampleRate: 0.1, // Set to 1.0 for testing
//   replaysOnErrorSampleRate: 1.0,
//   integrations: [
//     Sentry.mobileReplayIntegration(),
//     // You can configure replay options here, for example:
//     // Sentry.mobileReplayIntegration({
//     //   maskAllText: true,
//     //   maskAllImages: true,
//     //   maskAllVectors: true,
//     // }),
//   ],
// });

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

// disable reanimated logger
configureReanimatedLogger({
  level: ReanimatedLogLevel.warn,
  strict: false, // Reanimated runs in strict mode by default
});

function RootLayoutNav() {
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  const insets = useSafeAreaInsets();
  const systemColorScheme = useColorScheme();
  const { theme, setSystemTheme } = useThemeStore();

  useEffect(() => {
    if (systemColorScheme) {
      setSystemTheme(systemColorScheme);
    }
  }, [systemColorScheme]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

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

  return (
    <>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <GluestackUIProvider mode={theme === 'dark' ? 'dark' : 'light'}>
          <ThemeProvider value={theme === 'dark' ? CustomDarkTheme : CustomLightTheme}>
            <SafeAreaView className="flex-1 bg-background-0">
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

              <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
            </SafeAreaView>
          </ThemeProvider>
        </GluestackUIProvider>
      </GestureHandlerRootView>
      <Toast config={toastConfig} topOffset={insets.top + 8} />
    </>
  );
}

export default RootLayoutNav;
// export default Sentry.wrap(RootLayoutNav);
