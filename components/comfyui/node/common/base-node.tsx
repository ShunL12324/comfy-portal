import { Text } from '@/components/ui/text';
import { Colors } from '@/constants/Colors';
import { useGenerationNodeState } from '@/context/generation-context';
import { useThemeStore } from '@/store/theme';
import { Node } from '@/types/workflow';
import { MotiView } from 'moti';
import { ReactNode } from 'react';
import { View } from 'react-native';

export interface BaseNodeProps {
  node: Node;
  children: ReactNode;
  badges?: ReactNode;
}

export default function BaseNode({ node, children, badges }: BaseNodeProps) {
  const { isCurrentNode, isGenerating } = useGenerationNodeState(node.id);
  const { theme } = useThemeStore();
  const colors = theme === 'dark' ? Colors.dark : Colors.light;

  return (
    <MotiView
      animate={{
        scale: isCurrentNode && isGenerating ? [1, 1.02, 1] : 1,
        borderColor:
          isCurrentNode && isGenerating
            ? [colors.primary[400], colors.primary[700], colors.primary[400]]
            : colors.outline[50],
      }}
      transition={{
        type: 'timing',
        loop: isCurrentNode && isGenerating,
        duration: 1000,
      }}
      className="my-2 rounded-lg bg-background-0 p-4"
      style={{
        borderWidth: 1,
      }}
    >
      <View className="mb-2 flex-row items-center justify-between">
        <Text size="sm" bold>
          {node._meta?.title || node.class_type}
        </Text>
        {badges && <View className="flex-row items-center gap-1">{badges}</View>}
      </View>
      {children}
    </MotiView>
  );
}
