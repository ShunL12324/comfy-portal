import { StatusDot } from '@/components/self-ui/status-pill';
import { Text } from '@/components/ui/text';
import { Colors } from '@/constants/Colors';
import { useGenerationNodeState } from '@/features/generation/context/generation-context';
import { Node } from '@/features/workflow/types';
import { useResolvedTheme } from '@/store/theme';
import { MotiView } from 'moti';
import { ReactNode } from 'react';
import { View } from 'react-native';

export interface BaseNodeProps {
  node: Node;
  children: ReactNode;
  badges?: ReactNode;
}

/**
 * One ComfyUI node.
 *
 * The class name is set in mono because that is what it is — an identifier
 * copied verbatim from the graph, not a title someone wrote. A running node
 * sharpens its border and carries a progress line along its bottom edge, so
 * the node itself reports its state instead of a badge parked beside it.
 */
export default function BaseNode({ node, children, badges }: BaseNodeProps) {
  const { isCurrentNode, isGenerating } = useGenerationNodeState(node.id);
  const theme = useResolvedTheme();
  const colors = theme === 'dark' ? Colors.dark : Colors.light;
  const running = isCurrentNode && isGenerating;

  // A title the user set is prose; a bare class_type is an identifier. Only
  // the identifier gets the mono treatment.
  const title = node._meta?.title || node.class_type;
  const isIdentifier = !node._meta?.title && !!node.class_type;
  const isUnknown = !node._meta?.title && !node.class_type;

  return (
    <MotiView
      animate={{ borderColor: running ? colors.typography[950] : colors.outline[50] }}
      transition={{ type: 'timing', duration: 200 }}
      className="my-2 overflow-hidden rounded-lg border bg-surface-base"
    >
      <View className="p-4">
        <View className="mb-2 flex-row items-center justify-between">
          <Text
            size="sm"
            bold
            className={`flex-1 truncate ${isIdentifier ? 'font-mono' : ''} ${isUnknown ? 'text-status-danger' : ''}`}
            numberOfLines={1}
            strikeThrough={isUnknown}
          >
            {title || 'UNKNOWN_NODE'}
          </Text>
          <View className="flex-row items-center gap-2">
            {running ? (
              <View className="flex-row items-center gap-1.5">
                <StatusDot tone="busy" pulse />
                <Text className="text-xs text-content-tertiary">running</Text>
              </View>
            ) : null}
            {badges}
          </View>
        </View>
        {children}
      </View>

      {/* Sits on the node's own bottom edge rather than floating above it. */}
      {running ? <View className="h-0.5 w-full bg-ink" /> : null}
    </MotiView>
  );
}
