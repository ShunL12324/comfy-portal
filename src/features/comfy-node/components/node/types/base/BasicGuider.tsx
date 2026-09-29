import { Node } from '@/features/workflow/types';
import ImmutableNode from '../../common/immutable-node';

interface BasicGuiderProps {
  node: Node;
  serverId: string;
  workflowId: string;
}

export default function BasicGuider({ node, serverId, workflowId }: BasicGuiderProps) {
  return <ImmutableNode node={node} serverId={serverId} workflowId={workflowId} />;
}
