import { Copy, Status, useDesign } from '@/components/ui/design-system/primitives';
import { useGenerationNodeState } from '@/features/generation/context/generation-context';
import { Node } from '@/features/workflow/types';
import { MotiView } from 'moti';
import { ReactNode } from 'react';
import { View } from 'react-native';
import { designTokens as t } from '@/constants/design-tokens';
import { ControlDensityProvider } from '@/components/ui/design-system/control-density';

export interface BaseNodeProps {
  node: Node;
  children: ReactNode;
  badges?: ReactNode;
}

/**
 * One ComfyUI node.
 *
 * All display titles share one type role, including class-name fallbacks. A running node
 * sharpens its border and carries a progress line along its bottom edge, so
 * the node itself reports its state instead of a badge parked beside it.
 */
export default function BaseNode({ node, children, badges }: BaseNodeProps) {
  const { isCurrentNode, isGenerating } = useGenerationNodeState(node.id);
  const running = isCurrentNode && isGenerating;
  const c = useDesign();

  const title = node._meta?.title || node.class_type;
  const isUnknown = !node._meta?.title && !node.class_type;

  return (
    <ControlDensityProvider value="compact">
      <MotiView
        testID={`node-card-${node.id}`}
        animate={{ borderColor: running ? c.tint : c.subtle }}
        transition={{ type: 'timing', duration: 200 }}
        style={{
          marginVertical: t.node.cardGap / 2,
          backgroundColor: c.workspaceCard,
          overflow: 'hidden',
          borderRadius: t.radius.panel,
          borderWidth: 1,
        }}
      >
        <View style={{ padding: t.node.inset }}>
          <View style={{ marginBottom: t.node.headerGap }} className="flex-row items-center justify-between">
            <Copy
              size="label"
              style={[t.node.title, isUnknown ? { color: c.danger } : undefined]}
              className="flex-1 truncate"
              numberOfLines={1}
              strikeThrough={isUnknown}
            >
              {title || 'UNKNOWN_NODE'}
            </Copy>
            <View className="gap-2 flex-row items-center">
              {running ? <Status state="busy" label="running" /> : null}
              {badges}
            </View>
          </View>
          <View style={{ gap: t.node.fieldGap }}>{children}</View>
        </View>

        {/* Sits on the node's own bottom edge rather than floating above it. */}
        {running ? <View className="bottom-0 left-0 right-0 h-0.5 bg-tint absolute" /> : null}
      </MotiView>
    </ControlDensityProvider>
  );
}
