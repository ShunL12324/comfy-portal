/** The one product corner radius (pt). Every radius role below and every Tailwind `rounded-*` class reads it. */
const cornerRadius = 4;

/** Neutral surfaces are semantic roles, never independent component palettes.
 * See dev-docs/surface-system.md for assignments and measured contrast pairs.
 */
export const designColors = {
  dark: {
    paper: '#101010',
    workspace: '#1a1a1a',
    workspaceCard: '#242424',
    card: '#1c1c1c',
    well: '#141414',
    overlay: '#242424',
    raised: '#303030',
    ink: '#f5f5f5',
    secondary: '#c4c4c4',
    muted: '#a6a6a6',
    faint: '#606060',
    subtle: '#282828',
    line: '#3d3d3d',
    boundary: '#868686',
    solid: '#f5f5f5',
    onSolid: '#101010',
    // Compatibility names: neutral primary, inverse text, selected surface.
    tint: '#f5f5f5',
    onTint: '#101010',
    tintSurface: '#303030',
    ready: '#4ade80',
    danger: '#f87171',
    dangerSolid: '#c92a3e',
    onDanger: '#ffffff',
    warning: '#fbbf24',
    onWarning: '#101010',
    media: '#000000',
    onMedia: '#ffffff',
  },
  light: {
    paper: '#f4f4f4',
    workspace: '#ebebeb',
    workspaceCard: '#ffffff',
    card: '#ffffff',
    well: '#ebebeb',
    overlay: '#ffffff',
    raised: '#e3e3e3',
    ink: '#1c1c1c',
    secondary: '#4c4c4c',
    muted: '#626262',
    faint: '#a3a3a3',
    subtle: '#e6e6e6',
    line: '#d5d5d5',
    boundary: '#7c7c7c',
    solid: '#1c1c1c',
    onSolid: '#ffffff',
    tint: '#1c1c1c',
    onTint: '#ffffff',
    tintSurface: '#e3e3e3',
    ready: '#116a36',
    danger: '#b91c1c',
    dangerSolid: '#b91c1c',
    onDanger: '#ffffff',
    warning: '#8a5700',
    onWarning: '#ffffff',
    media: '#000000',
    onMedia: '#ffffff',
  },
};
export type DesignMode = keyof typeof designColors;
export type DesignColors = typeof designColors.light;
export const designTokens = {
  space: [4, 8, 12, 16, 20, 24, 32] as const,
  radius: {
    small: cornerRadius,
    choice: cornerRadius,
    choiceThumb: cornerRadius,
    control: cornerRadius,
    panel: cornerRadius,
    sheet: cornerRadius,
    pill: cornerRadius,
  },
  height: { small: 28, control: 36, touch: 44 },
  elevation: {
    workspace: {
      light: { shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: -3 } },
      dark: { shadowOpacity: 0, shadowRadius: 0, shadowOffset: { width: 0, height: 0 } },
    },
  },
  sheet: { handleHeight: 24, indicatorWidth: 32, indicatorHeight: 3 },
  slider: { readoutMinWidth: 56, readoutCharacterWidth: 8 },
  chat: { inputLines: 4 },
  gutter: 20,
  layout: {
    label: 4,
    related: 8,
    list: 8,
    field: 12,
    inset: 16,
    section: 24,
    gutter: 20,
    rowX: 12,
    rowY: 10,
    badgeX: 6,
    badgeY: 2,
    joined: 0,
    status: 6,
    /** Icon-to-label gap inside a labelled button; the icon slot is sized to the icon, so this is the visible gap. */
    iconLabel: 6,
  },
  font: {
    sans: 'Barlow',
    medium: 'BarlowMedium',
    semibold: 'BarlowSemiBold',
    bold: 'BarlowBold',
    sansItalic: 'BarlowItalic',
    mediumItalic: 'BarlowMediumItalic',
    semiboldItalic: 'BarlowSemiBoldItalic',
    boldItalic: 'BarlowBoldItalic',
    title: 'BarlowSemiBold',
    titleSemibold: 'BarlowSemiBold',
    italic: 'BarlowItalic',
    mono: 'Barlow', // Compatibility alias: numeric text uses the same sans family.
  },
  /** UIKit's UIFont resolves PostScript names, rather than Expo's RN aliases. */
  nativeFont: { sans: 'Barlow-Regular', medium: 'Barlow-Medium' },
  type: { title: 26, heading: 20, section: 14, body: 13, label: 12, metadata: 11, micro: 10 },
  /** Line height paired with each type size. */
  leading: { title: 30, heading: 24, section: 20, body: 20, label: 18, metadata: 16, micro: 16 },
  card: { title: { fontSize: 16, lineHeight: 22, fontWeight: '600' }, summaryGap: 16, meterWidth: 28 },
  /** Compact node editor: roles stay stable across custom and schema-driven nodes. */
  node: {
    title: { fontSize: 13, lineHeight: 18, fontWeight: '500' },
    label: { fontSize: 12, lineHeight: 18, fontWeight: '500' },
    body: { fontSize: 12, lineHeight: 18, fontWeight: '400' },
    hint: { fontSize: 11, lineHeight: 16, fontWeight: '400' },
    inset: 12,
    cardGap: 8,
    headerGap: 8,
    fieldGap: 12,
    labelGap: 4,
    inlineGap: 8,
    promptHeight: 88,
    imageHeight: 160,
  },
  /** Lucide sizes on the 24-unit grid; stroke follows via iconStroke. */
  icon: { indicator: 9, micro: 12, small: 14, control: 16, medium: 18, large: 20, hero: 24, display: 40 },
  /** Durations (ms). `enter`/`exit` move full-screen surfaces in and out, such as the media viewer's zoom. */
  motion: { fast: 160, base: 200, press: 180, progress: 240, enter: 280, exit: 240, spin: 1000, breathe: 2800 },
  /**
   * Cubic-bézier control points for `Easing.bezier`: arrivals decelerate into
   * place, departures accelerate away. No overshoot anywhere.
   */
  easing: {
    enter: [0.2, 0, 0, 1],
    exit: [0.4, 0, 1, 1],
  },
  /** `badge` is the media scrim behind light labels; dense enough for onMedia text over a white frame. */
  opacity: { pressed: 0.84, disabled: 0.4, scrim: 0.5, badge: 0.64 },
} as const;
export type TypeSize = keyof typeof designTokens.type;
export type IconSize = (typeof designTokens.icon)[keyof typeof designTokens.icon];
/** Legacy component size names resolve to the same pixel tokens as direct Lucide icons. */
export const iconSizes = {
  '2xs': designTokens.icon.micro,
  xs: designTokens.icon.small,
  sm: designTokens.icon.control,
  md: designTokens.icon.medium,
  lg: designTokens.icon.large,
  xl: designTokens.icon.hero,
  display: designTokens.icon.display,
} as const;
/** Lucide paths use a 24-unit viewBox. Compensate once for viewport scaling:
 * 14pt metadata paints at 1.25pt; controls at 1.5pt; large state glyphs stay quiet.
 * Passing a smaller stroke for a smaller viewport would shrink it twice.
 */
export const iconStroke = (size: number) => {
  const paintedStroke = size <= 14 ? 1.25 : size <= 20 ? 1.5 : size <= 24 ? 1.75 : 2;
  return (paintedStroke * 24) / size;
};
