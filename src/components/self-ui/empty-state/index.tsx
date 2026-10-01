import { Copy } from '@/components/ui/design-system/primitives';
import { View } from '@/components/ui/view';
import type { ReactNode } from 'react';
import { designTokens as t } from '@/constants/design-tokens';

interface EmptyStateProps {
  /** A short line admitting there is nothing here: "No servers yet". */
  title?: string;
  /** What to do about it. */
  children: ReactNode;
  /** The empty-state illustration (see design-system/empty-state-art). */
  art?: ReactNode;
  /** A quieter final line, such as where the add control is. */
  hint?: string;
  /** Usually a link to a guide, or the control that fills the list. */
  action?: ReactNode;
  /**
   * `center` fills the space it is given and sits at its optical centre, for an
   * empty collection. `top` is a left-aligned note under whatever precedes it.
   */
  align?: 'center' | 'top';
  testID?: string;
}

/**
 * What a list looks like when it has nothing in it. Every empty collection
 * uses this, so the illustration, copy and spacing land in the same place on
 * every tab.
 */
export function EmptyState({ title, children, art, hint, action, align = 'top', testID }: EmptyStateProps) {
  const centered = align === 'center';
  const text = centered ? ({ alignSelf: 'stretch', textAlign: 'center' } as const) : undefined;
  const copy = (
    <View style={{ alignSelf: 'stretch', alignItems: centered ? 'center' : 'flex-start', gap: t.layout.related }}>
      {title ? <Copy size="section">{title}</Copy> : null}
      <Copy muted style={text}>
        {children}
      </Copy>
      {hint ? (
        <Copy muted size="metadata" style={text}>
          {hint}
        </Copy>
      ) : null}
      {action ? <View style={{ paddingTop: t.layout.related }}>{action}</View> : null}
    </View>
  );
  if (!centered) {
    return (
      <View testID={testID} style={{ paddingVertical: t.layout.inset }}>
        {art ? <View style={{ paddingBottom: t.layout.inset }}>{art}</View> : null}
        {copy}
      </View>
    );
  }
  // The illustration, not the whole block, sits at the optical centre (2:3 above/below), so
  // it lands at the same height on every tab however long the copy under it runs.
  return (
    <View testID={testID} style={{ flex: 1, alignItems: 'center', paddingHorizontal: t.layout.inset }}>
      <View style={{ flex: 2 }} />
      {art}
      <View style={{ flex: 3, alignSelf: 'stretch', paddingTop: t.layout.inset }}>{copy}</View>
    </View>
  );
}
