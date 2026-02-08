'use client';
import React, { useEffect } from 'react';
import { View, ViewProps } from 'react-native';
import { OverlayProvider } from '@gluestack-ui/core/overlay/creator';
import { ToastProvider } from '@gluestack-ui/core/toast/creator';
import { colorScheme as nativewindColorScheme, useColorScheme } from 'nativewind';
import { config } from './config';

type ModeType = 'light' | 'dark' | 'system';

export function GluestackUIProvider({
  mode = 'system',
  children,
  style,
}: {
  mode?: ModeType;
  children?: React.ReactNode;
  style?: ViewProps['style'];
}) {
  // Use NativeWind's useColorScheme instead of RN's. On RN 0.83+, after
  // Appearance.setColorScheme(null) (triggered by nativewindColorScheme.set('system')),
  // RN's useColorScheme() returns null until the native event fires asynchronously.
  // NativeWind's observable system handles this correctly.
  const { colorScheme: nwColorScheme } = useColorScheme();
  const resolvedMode = mode === 'system' ? (nwColorScheme ?? 'light') : mode;

  useEffect(() => {
    // Pass the raw user intent to NativeWind. NativeWind handles 'system'
    // internally by calling Appearance.setColorScheme(null) and then
    // listening for the native appearance change event via its own
    // observable system.
    //
    // Do NOT pass resolvedMode here — when switching from a forced theme
    // (e.g. 'light') back to 'system', resolvedMode is stale and would
    // re-override the Appearance, preventing the switch to the actual
    // system theme.
    nativewindColorScheme.set(mode);
  }, [mode]);

  return (
    <View
      style={[
        { flex: 1, height: '100%', width: '100%' },
        resolvedMode === 'dark' ? config.dark : config.light,
        style,
      ]}
    >
      <OverlayProvider>
        <ToastProvider>{children}</ToastProvider>
      </OverlayProvider>
    </View>
  );
}
