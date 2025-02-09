import { ModelSelector } from '@/components/selectors/model';
import { useWorkflowStore } from '@/store/workflow';
import { Node } from '@/types/workflow';
import BaseNode from '../../common/base-node';

interface LoraLoaderProps {
  node: Node;
  serverId: string;
  workflowId: string;
}

export default function LoraLoader({ node, serverId, workflowId }: LoraLoaderProps) {
  const updateNodeInput = useWorkflowStore((state) => state.updateNodeInput);

  return (
    <BaseNode node={node}>
      <ModelSelector
        value={node.inputs.lora_name}
        onChange={(value) => updateNodeInput(workflowId, node.id, 'lora_name', value)}
        serverId={serverId}
        type="loras"
        onLoraClipStrengthChange={(value) => updateNodeInput(workflowId, node.id, 'strength_clip', value)}
        onLoraModelStrengthChange={(value) => updateNodeInput(workflowId, node.id, 'strength_model', value)}
        initialClipStrength={node.inputs.strength_clip}
        initialModelStrength={node.inputs.strength_model}
      />
    </BaseNode>
  );
}
