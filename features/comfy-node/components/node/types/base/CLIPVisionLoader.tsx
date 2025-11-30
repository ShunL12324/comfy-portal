import { ModelSelector } from '@/components/common/selectors/model';
import { useWorkflowStore } from '@/features/workflow/stores/workflow-store';
import { Node } from '@/features/workflow/types';
import BaseNode from '../../common/base-node';

interface CLIPVisionLoaderProps {
  node: Node;
  serverId: string;
  workflowId: string;
}

export default function CLIPVisionLoader({ node, serverId, workflowId }: CLIPVisionLoaderProps) {
  const updateNodeInput = useWorkflowStore((state) => state.updateNodeInput);
  return (
    <BaseNode node={node}>
      <ModelSelector
        value={node.inputs.clip_name}
        onChange={(model) => {
          updateNodeInput(workflowId, node.id, 'clip_name', model);
        }}
        type="clip_vision"
        serverId={serverId}
      />
    </BaseNode>
  );
}
