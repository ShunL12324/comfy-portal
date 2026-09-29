import { Node } from '@/features/workflow/types';
import BaseNode from '../../common/base-node';
import SeedControl from '../../common/seed-control';

interface RandomNoiseProps {
  node: Node;
  serverId: string;
  workflowId: string;
}

export default function RandomNoise({ node, workflowId }: RandomNoiseProps) {
  return (
    <BaseNode node={node}>
      <SeedControl node={node} workflowId={workflowId} inputKey="noise_seed" title="Noise seed" />
    </BaseNode>
  );
}
