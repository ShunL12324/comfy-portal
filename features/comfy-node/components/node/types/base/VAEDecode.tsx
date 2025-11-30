import { Node } from '@/features/workflow/types';
import ImmutableNode from '../../common/immutable-node';
interface VAEDecodeProps {
  node: Node;
  serverId: string;
  workflowId: string;
}

export default function VAEDecode({ node, serverId, workflowId }: VAEDecodeProps) {
  return <ImmutableNode node={node} serverId={serverId} workflowId={workflowId} />;
}
