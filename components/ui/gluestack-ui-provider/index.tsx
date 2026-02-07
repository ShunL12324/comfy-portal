'use client';
import React, { useEffect } from 'react';
import { View, ViewProps, useColorScheme } from 'react-native';
import { OverlayProvider } from '@gluestack-ui/core/overlay/creator';
import { ToastProvider } from '@gluestack-ui/core/toast/creator';
import { colorScheme as nativewindColorScheme } from 'nativewind';
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
  const systemColorScheme = useColorScheme();
  const resolvedMode = mode === 'system' ? (systemColorScheme ?? 'light') : mode;

  useEffect(() => {
    // 'system' → calls Appearance.setColorScheme(null) to reset global override
    // 'light'/'dark' → calls Appearance.setColorScheme(value) to force override
    nativewindColorScheme.set(mode === 'system' ? 'system' : mode);
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
