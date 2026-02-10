/**
 * Filters out React Native-specific props that are not valid on DOM elements.
 * Use this in .web.tsx components before spreading props onto HTML elements.
 */

const RN_PROPS = new Set([
  'numberOfLines',
  'ellipsizeMode',
  'selectable',
  'adjustsFontSizeToFit',
  'minimumFontScale',
  'maxFontSizeMultiplier',
  'suppressHighlighting',
  'lineBreakMode',
  'textBreakStrategy',
  'allowFontScaling',
  'accessible',
  'accessibilityRole',
  'accessibilityState',
  'accessibilityLabel',
  'accessibilityHint',
  'onAccessibilityTap',
  'importantForAccessibility',
  'collapsable',
  'needsOffscreenAlphaCompositing',
  'renderToHardwareTextureAndroid',
  'shouldRasterizeIOS',
  'removeClippedSubviews',
  'dataDetectorType',
  'android_hyphenationFrequency',
  'dynamicTypeRamp',
  'lineBreakStrategyIOS',
]);

export function filterRNProps<T extends Record<string, any>>(
  props: T
): Omit<T, string> {
  const filtered: Record<string, any> = {};
  for (const key in props) {
    if (!RN_PROPS.has(key)) {
      // Also flatten style arrays for DOM compatibility
      if (key === 'style' && Array.isArray(props[key])) {
        filtered[key] = Object.assign({}, ...props[key].filter(Boolean));
      } else {
        filtered[key] = props[key];
      }
    }
  }
  return filtered as any;
}
