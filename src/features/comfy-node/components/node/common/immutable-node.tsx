import { Copy } from '@/components/ui/design-system/primitives';
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
      <Copy size="metadata" muted>
        This node does not include any adjustable parameters.
      </Copy>
    </BaseNode>
  );
}
