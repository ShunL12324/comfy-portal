import { Copy, useDesign } from '@/components/ui/design-system/primitives';
import { designTokens as t } from '@/constants/design-tokens';
import { StyleSheet, View } from 'react-native';

/**
 * A compact label laid over generated media. A translucent media scrim sits
 * behind onMedia text so it stays legible over bright and dark frames alike.
 */
export function MediaBadge({ children }: { children: React.ReactNode }) {
  const c = useDesign();
  return (
    <View
      style={{
        borderRadius: t.radius.small,
        paddingHorizontal: t.layout.badgeX,
        paddingVertical: t.layout.badgeY,
        overflow: 'hidden',
      }}
    >
      <View style={[StyleSheet.absoluteFill, { backgroundColor: c.media, opacity: t.opacity.badge }]} />
      <Copy mono size="metadata" style={{ color: c.onMedia, fontWeight: '500' }}>
        {children}
      </Copy>
    </View>
  );
}
