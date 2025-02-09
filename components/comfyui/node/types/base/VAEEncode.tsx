import { Node } from '@/types/workflow';
import ImmutableNode from '../../common/immutable-node';

interface VAEEncodeProps {
  node: Node;
  serverId: string;
  workflowId: string;
}

export default function VAEEncode({ node, serverId, workflowId }: VAEEncodeProps) {
  return <ImmutableNode node={node} serverId={serverId} workflowId={workflowId} />;
}
