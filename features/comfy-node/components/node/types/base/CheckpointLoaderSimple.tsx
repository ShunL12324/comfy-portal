import { ModelSelector } from '@/components/common/selectors/model';
import { useWorkflowStore } from '@/features/workflow/stores/workflow-store';
import { Node } from '@/features/workflow/types';
import BaseNode from '../../common/base-node';

interface CheckpointLoaderSimpleProps {
  node: Node;
  serverId: string;
  workflowId: string;
}

export default function CheckpointLoaderSimple({ node, serverId, workflowId }: CheckpointLoaderSimpleProps) {
  const updateNodeInput = useWorkflowStore((state) => state.updateNodeInput);

  return (
    <BaseNode node={node}>
      <ModelSelector
        value={node.inputs.ckpt_name}
        onChange={(value) => {
          updateNodeInput(workflowId, node.id, 'ckpt_name', value);
        }}
        type="checkpoints"
        serverId={serverId}
      />
    </BaseNode>
  );
}
