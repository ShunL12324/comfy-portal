'use client';
import { Colors } from '@/constants/Colors';
import { designColors } from '@/constants/design-tokens';
import { vars } from 'nativewind';

function hexToRgb(hex: string) {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(' ');
}

function themeVariables(theme: typeof Colors.light, colors: typeof designColors.light) {
  const tokens: Record<string, string> = {};
  for (const [category, shades] of Object.entries(theme)) {
    for (const [shade, hex] of Object.entries(shades)) {
      tokens[`--color-${category}-${shade}`] = hexToRgb(hex);
    }
  }
  for (const status of ['error', 'warning', 'success', 'info'] as const) {
    tokens[`--color-background-${status}`] = tokens[`--color-${status}-50`];
  }
  tokens['--color-background-muted'] = tokens['--color-background-100'];
  for (const status of ['info', 'error'] as const) {
    tokens[`--color-indicator-${status}`] = tokens[`--color-${status}-500`];
  }
  // Direct semantic variables keep NativeWind and style-based components identical.
  for (const [name, value] of Object.entries(colors)) tokens[`--surface-role-${name}`] = hexToRgb(value);
  tokens['--color-status-online'] = hexToRgb(colors.ready);
  tokens['--color-card'] = hexToRgb(colors.card);
  tokens['--color-tint'] = hexToRgb(colors.tint);
  tokens['--color-on-tint'] = hexToRgb(colors.onTint);
  tokens['--color-tint-surface'] = hexToRgb(colors.tintSurface);
  tokens['--color-indicator-primary'] = tokens['--color-primary-500'];
  return vars(tokens);
}

export const config = {
  light: themeVariables(Colors.light, designColors.light),
  dark: themeVariables(Colors.dark, designColors.dark),
};
