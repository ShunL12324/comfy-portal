'use client';
import React, { useEffect, useRef } from 'react';
import { Appearance, View, ViewProps } from 'react-native';
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
  const { colorScheme: nwColorScheme } = useColorScheme();
  const prevModeRef = useRef(mode);

  // On cold start with 'system', NativeWind already reads the native
  // Appearance correctly. Calling nativewindColorScheme.set('system')
  // would trigger Appearance.setColorScheme(null), which briefly resets
  // the native color scheme to null → fallback to 'light' → flash.
  //
  // We only call set() when mode actually changes (e.g. user switches
  // theme in settings), or on mount when mode is NOT 'system' (i.e.
  // user had previously forced light/dark and we need to override).
  useEffect(() => {
    if (prevModeRef.current !== mode || mode !== 'system') {
      nativewindColorScheme.set(mode);
    }
    prevModeRef.current = mode;
  }, [mode]);

  // For 'system' mode, read the native appearance directly as a
  // synchronous fallback to avoid the brief null from NativeWind's
  // observable during cold start.
  const resolvedMode = mode === 'system'
    ? (nwColorScheme ?? Appearance.getColorScheme() ?? 'light')
    : mode;

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
