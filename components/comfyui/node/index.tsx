import { Node } from '@/types/workflow';
import { getNodeComponent } from './types';

interface NodeProps {
  node: Node;
  serverId: string;
  workflowId: string;
}

export default function NodeComponent({ node, serverId, workflowId }: NodeProps) {
  const NodeContent = getNodeComponent(node.class_type);
  return <NodeContent node={node} serverId={serverId} workflowId={workflowId} />;
}
