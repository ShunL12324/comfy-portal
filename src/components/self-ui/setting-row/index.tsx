import { Copy, Row, useDesign } from '@/components/ui/design-system/primitives';
import { Pressable } from '@/components/ui/pressable';
import { designTokens as t, iconStroke } from '@/constants/design-tokens';
import { Link, type Href } from 'expo-router';
import { ChevronRight, type LucideIcon } from '@/constants/icons';
import { MotiView } from 'moti';
import { type ReactNode } from 'react';
interface SettingRowProps {
  icon: LucideIcon;
  label: string;
  href?: Href;
  onPress?: () => void;
  right?: ReactNode;
  expanded?: boolean;
  destructive?: boolean;
}
/**
 * A Settings entry: icon, label and trailing affordance on bare paper.
 *
 * The row carries no fill, radius or rule of its own: Settings is one
 * continuous list, so the rows themselves are the structure.
 */
export function SettingRow({ icon: Icon, label, href, onPress, right, expanded, destructive }: SettingRowProps) {
  const c = useDesign();
  const body = (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={{
        minHeight: t.height.touch,
        justifyContent: 'center',
        paddingVertical: t.layout.rowY,
      }}
    >
      <Row style={{ gap: t.layout.field }}>
        <Icon size={t.icon.control} strokeWidth={iconStroke(t.icon.control)} color={destructive ? c.danger : c.secondary} />
        <Copy style={[{ flex: 1, fontWeight: '500' }, destructive && { color: c.danger }]}>{label}</Copy>
        {right ?? (
          <MotiView animate={{ rotate: expanded ? '90deg' : '0deg' }} transition={{ type: 'timing', duration: 160 }}>
            <ChevronRight strokeWidth={iconStroke(t.icon.small)} size={t.icon.small} color={c.muted} />
          </MotiView>
        )}
      </Row>
    </Pressable>
  );
  return href ? (
    <Link href={href} asChild>
      {body}
    </Link>
  ) : (
    body
  );
}
