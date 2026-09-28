import { designColors, type DesignColors } from './design-tokens';

/** Compatibility scales for Gluestack. Every value comes from the semantic palette. */
function statusScale(c: DesignColors, role: keyof DesignColors) {
  return {
    0: c.well,
    50: c.well,
    100: c.well,
    200: c.line,
    300: c.line,
    400: c.muted,
    500: c[role],
    600: c[role],
    700: c[role],
    800: c[role],
    900: c[role],
    950: c[role],
  };
}

function compatibilityColors(c: DesignColors) {
  const primary = {
    0: c.raised,
    50: c.raised,
    100: c.raised,
    200: c.raised,
    300: c.raised,
    400: c.solid,
    500: c.solid,
    600: c.solid,
    700: c.solid,
    800: c.solid,
    900: c.solid,
    950: c.solid,
  };
  const neutral = {
    0: c.card,
    50: c.card,
    100: c.well,
    200: c.raised,
    300: c.line,
    400: c.boundary,
    500: c.muted,
    600: c.secondary,
    700: c.secondary,
    800: c.ink,
    900: c.ink,
    950: c.ink,
  };
  return {
    primary,
    secondary: neutral,
    tertiary: neutral,
    error: statusScale(c, 'danger'),
    success: statusScale(c, 'ready'),
    warning: statusScale(c, 'warning'),
    info: statusScale(c, 'secondary'),
    typography: {
      0: c.onSolid,
      50: c.onSolid,
      100: c.faint,
      200: c.faint,
      300: c.faint,
      400: c.muted,
      500: c.secondary,
      600: c.secondary,
      700: c.secondary,
      800: c.ink,
      900: c.ink,
      950: c.ink,
    },
    outline: {
      0: c.subtle,
      50: c.line,
      100: c.line,
      200: c.line,
      300: c.line,
      400: c.boundary,
      500: c.boundary,
      600: c.secondary,
      700: c.ink,
      800: c.ink,
      900: c.ink,
      950: c.ink,
    },
    background: {
      0: c.paper,
      50: c.well,
      100: c.well,
      200: c.raised,
      300: c.line,
      400: c.boundary,
      500: c.muted,
      600: c.secondary,
      700: c.secondary,
      800: c.ink,
      900: c.ink,
      950: c.ink,
    },
  };
}

export const Colors = {
  light: compatibilityColors(designColors.light),
  dark: compatibilityColors(designColors.dark),
};
