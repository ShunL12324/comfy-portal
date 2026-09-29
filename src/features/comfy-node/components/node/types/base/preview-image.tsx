import { Node } from '@/features/workflow/types';
import ImmutableNode from '../../common/immutable-node';

interface PreviewImageProps {
  node: Node;
  serverId: string;
  workflowId: string;
}

export default function PreviewImage({ node, serverId, workflowId }: PreviewImageProps) {
  return <ImmutableNode node={node} serverId={serverId} workflowId={workflowId} />;
}
