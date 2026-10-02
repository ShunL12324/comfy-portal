import { loraStrengthValue } from '@/features/comfy-node/utils/lora-strength';
import { useWorkflowStore } from '@/features/workflow/stores/workflow-store';
import { Node } from '@/features/workflow/types';
import BaseNode from '../../common/base-node';
import LoraRow from '../../common/lora-row';

interface LoraLoaderModelOnlyProps {
  node: Node;
  serverId: string;
  workflowId: string;
}

export default function LoraLoaderModelOnly({ node, serverId, workflowId }: LoraLoaderModelOnlyProps) {
  const updateNodeInput = useWorkflowStore((state) => state.updateNodeInput);

  return (
    <BaseNode node={node}>
      <LoraRow
        title="LoRA"
        serverId={serverId}
        lora={node.inputs.lora_name}
        onLoraChange={(value) => updateNodeInput(workflowId, node.id, 'lora_name', value)}
        classType={node.class_type}
        strengthKind="model"
        strength={loraStrengthValue(node.inputs.strength_model)}
        onStrengthChange={(value) => updateNodeInput(workflowId, node.id, 'strength_model', value)}
      />
    </BaseNode>
  );
}
