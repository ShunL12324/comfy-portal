import { designTokens as t, type IconSize } from '@/constants/design-tokens';

/**
 * Icon geometry for `Action`. A labelled button pairs a micro icon with its 13pt
 * label (Lucide's 20/24 live area paints ~10pt against Barlow's 9.1pt caps) in a
 * slot sized to the icon, then `layout.iconLabel`. Icon-only buttons keep the
 * 16pt minimum slot that centres their glyph in the 44pt target.
 */
export function actionIconGeometry({
  iconOnly,
  inAppBar,
  iconSize,
}: {
  iconOnly: boolean;
  inAppBar: boolean;
  iconSize?: IconSize;
}) {
  const size = iconSize ?? (iconOnly ? (inAppBar ? t.icon.large : t.icon.small) : t.icon.micro);
  return {
    iconSize: size,
    slot: iconOnly ? Math.max(t.icon.control, size) : size,
    // The ring matches a labelled icon; icon-only buttons keep their 16pt ring.
    spinner: iconOnly ? t.icon.control : size,
    gap: iconOnly ? 0 : t.layout.iconLabel,
  };
}
