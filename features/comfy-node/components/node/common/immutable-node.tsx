import { Text } from '@/components/ui/text';
import { Node } from '@/features/workflow/types';
import BaseNode from './base-node';

interface ImmutableNodeProps {
  node: Node;
  serverId: string;
  workflowId: string;
}

export default function ImmutableNode({ node, serverId, workflowId }: ImmutableNodeProps) {
  return (
    <BaseNode node={node}>
      <Text size="sm" className="text-typography-500">
        This node does not include any adjustable parameters.
      </Text>
    </BaseNode>
  );
}
