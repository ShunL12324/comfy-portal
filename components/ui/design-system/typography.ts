import { Platform, StyleSheet, type StyleProp, type TextStyle } from 'react-native';
import { designTokens as t } from '@/constants/design-tokens';

const families: Record<string, string> = {
  'font-body': t.font.sans,
  'font-heading': t.font.sans,
  'font-sans': t.font.sans,
  'font-mono': t.font.mono,
  'font-serif': t.font.title,
  'font-serif-italic': t.font.italic,
  'font-serif-semibold': t.font.titleSemibold,
};
const weights: Record<string, TextStyle['fontWeight']> = {
  'font-normal': '400',
  'font-medium': '500',
  'font-semibold': '600',
  'font-bold': '700',
};
const sansFaces = [t.font.sans, t.font.medium, t.font.semibold, t.font.bold];
const sansItalicFaces = [t.font.sansItalic, t.font.mediumItalic, t.font.semiboldItalic, t.font.boldItalic];

/** Select a loaded face rather than asking the platform to synthesize a weight.
 * NativeWind resolves classes to native styles, but retains CSS markers on web.
 * Both routes arrive here; explicit styles take precedence over utility classes.
 */
export function resolveTypography(
  style?: StyleProp<TextStyle>,
  className = '',
): {
  fontFamily: string;
  fontWeight: '400';
  fontStyle: 'normal';
  fontVariant?: TextStyle['fontVariant'];
} {
  const flat = StyleSheet.flatten(style) ?? {};
  const classes: TextStyle = {};
  const cssClasses = Object.entries(flat)
    .filter(([key, value]) => key !== '$$css' && typeof value === 'string' && (flat as any).$$css)
    .map(([, value]) => value)
    .join(' ');
  for (const token of `${cssClasses} ${className}`.split(/\s+/)) {
    if (families[token]) classes.fontFamily = families[token];
    if (token === 'font-mono' || token === 'tabular-nums') classes.fontVariant = ['tabular-nums'];
    if (weights[token]) classes.fontWeight = weights[token];
    if (token === 'italic') classes.fontStyle = 'italic';
    if (token === 'not-italic') classes.fontStyle = 'normal';
  }

  const family = flat.fontFamily ?? classes.fontFamily ?? t.font.sans;
  const regularIndex = sansFaces.indexOf(family as (typeof sansFaces)[number]);
  const italicIndex = sansItalicFaces.indexOf(family as (typeof sansItalicFaces)[number]);
  const explicitFace = family !== t.font.sans && (regularIndex >= 0 || italicIndex >= 0);
  const requestedWeight = flat.fontWeight ?? (flat.fontFamily && explicitFace ? undefined : classes.fontWeight);
  const numericWeight = requestedWeight === 'bold' ? 700 : requestedWeight === 'normal' ? 400 : Number(requestedWeight);
  // A named static face with weight 400 means "render this exact loaded face".
  const faceIndex =
    explicitFace && (!numericWeight || numericWeight === 400)
      ? Math.max(regularIndex, italicIndex, 0)
      : numericWeight >= 700
        ? 3
        : numericWeight >= 600
          ? 2
          : numericWeight >= 500
            ? 1
            : 0;
  const italic = italicIndex >= 0 || (flat.fontStyle ?? classes.fontStyle) === 'italic';
  const fontFamily = (italic ? sansItalicFaces : sansFaces)[faceIndex];
  return {
    fontFamily,
    fontWeight: '400',
    fontStyle: 'normal',
    ...(classes.fontVariant ? { fontVariant: flat.fontVariant ?? classes.fontVariant } : {}),
  };
}

/** Raw native inputs have no browser/OS typography defaults of their own. */
export function inputTypography(style?: StyleProp<TextStyle>, multiline = false) {
  return [
    { fontSize: t.type.body, lineHeight: t.leading.body },
    style,
    resolveTypography(style),
    // Native single-line inputs must use the font's intrinsic line metrics.
    // A paragraph lineHeight shifts the baseline within UIKit's input rect.
    !multiline &&
      Platform.OS !== 'web' && {
        lineHeight: undefined,
        textAlignVertical: 'center' as const,
        includeFontPadding: false,
        paddingVertical: 0,
      },
  ];
}

/** DOM text uses CSS strings for numeral features, while RN uses an array. */
export function resolveWebTypography(style?: StyleProp<TextStyle>, className = '') {
  const { fontVariant, ...face } = resolveTypography(style, className);
  const variant = fontVariant ?? StyleSheet.flatten(style)?.fontVariant;
  return { ...face, ...(variant ? { fontVariant: Array.isArray(variant) ? variant.join(' ') : variant } : {}) };
}
