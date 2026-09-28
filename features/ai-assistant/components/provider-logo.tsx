import { useDesign } from '@/components/ui/design-system/primitives';
import { SvgXml } from 'react-native-svg';

import { PROVIDER_LOGOS } from '../provider-logos';
import { AIProviderType } from '../types';

interface ProviderLogoProps {
  type: AIProviderType;
  size?: number;
}

/**
 * A provider's mark, tinted to the current theme.
 *
 * The logos are single-`currentColor` glyphs, so the colour is passed through
 * `SvgXml`'s `color` prop rather than being baked in — a fixed brand colour
 * would be unreadable against one of the two themes.
 *
 * Renders nothing for providers without a logo (notably `openai-compatible`,
 * which isn't one service), so callers should keep their own fallback.
 */
export function ProviderLogo({ type, size = 20 }: ProviderLogoProps) {
  const c = useDesign();
  const xml = PROVIDER_LOGOS[type];
  if (!xml) return null;

  const color = c.ink;

  return <SvgXml xml={xml} width={size} height={size} color={color} />;
}
