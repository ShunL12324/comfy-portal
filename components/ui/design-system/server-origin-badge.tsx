import { LayoutTemplate, Server, type LucideIcon } from '@/constants/icons';
import { Badge } from '@/components/ui/badge';
import { designTokens as t } from '@/constants/design-tokens';
import { Copy, useDesign } from './primitives';

export type ServerOrigin = 'Manual' | 'Template build';

/**
 * Where a server came from, as a glyph. The list card's tile draws it at
 * tile size; the badge beside the title repeats it as a word, the way a
 * status dot is always paired with its word.
 */
export const originIcon: Record<ServerOrigin, LucideIcon> = {
  Manual: Server,
  'Template build': LayoutTemplate,
};

export function ServerOriginBadge({ origin }: { origin: ServerOrigin }) {
  const c = useDesign();
  return (
    <Badge
      testID="server-origin-badge"
      variant="outline"
      style={{
        paddingHorizontal: t.layout.badgeX,
        paddingVertical: t.layout.badgeY,
        borderRadius: t.radius.small,
        borderColor: c.subtle,
        backgroundColor: 'transparent',
      }}
    >
      <Copy size="metadata" muted numberOfLines={1}>
        {origin}
      </Copy>
    </Badge>
  );
}
