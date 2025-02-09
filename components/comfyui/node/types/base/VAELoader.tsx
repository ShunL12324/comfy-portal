import { ModelSelector } from '@/components/selectors/model';
import { useWorkflowStore } from '@/store/workflow';
import { Node } from '@/types/workflow';
import BaseNode from '../../common/base-node';

interface VAELoaderProps {
  node: Node;
  serverId: string;
  workflowId: string;
}

export default function VAELoader({ node, serverId, workflowId }: VAELoaderProps) {
  const updateNodeInput = useWorkflowStore((state) => state.updateNodeInput);
  return (
    <BaseNode node={node}>
      <ModelSelector
        value={node.inputs.vae_name}
        onChange={(model) => {
          updateNodeInput(workflowId, node.id, 'vae_name', model);
        }}
        type="vae"
        serverId={serverId}
      />
    </BaseNode>
  );
}
