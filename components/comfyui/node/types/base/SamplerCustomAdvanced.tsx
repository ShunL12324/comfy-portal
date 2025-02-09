import { Node } from '@/types/workflow';
import ImmutableNode from '../../common/immutable-node';

interface SamplerCustomAdvancedProps {
  node: Node;
  serverId: string;
  workflowId: string;
}

export default function SamplerCustomAdvanced({ node, serverId, workflowId }: SamplerCustomAdvancedProps) {
  return <ImmutableNode node={node} serverId={serverId} workflowId={workflowId} />;
}
