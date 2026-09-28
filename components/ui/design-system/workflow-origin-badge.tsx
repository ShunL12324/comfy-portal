import { Badge } from '@/components/ui/badge';
import { Copy, useDesign } from './primitives';
import { designTokens as t } from '@/constants/design-tokens';

/** Same quiet origin treatment as the reviewed server badge. */
export function WorkflowOriginBadge({ server }: { server: boolean }) {
  const c = useDesign();
  return (
    <Badge
      variant="outline"
      style={{
        paddingHorizontal: t.layout.badgeX,
        paddingVertical: t.layout.badgeY,
        borderRadius: t.radius.small,
        borderColor: c.line,
        backgroundColor: c.raised,
        flexShrink: 0,
      }}
    >
      <Copy size="metadata" muted numberOfLines={1}>
        {server ? 'Server' : 'Imported'}
      </Copy>
    </Badge>
  );
}
