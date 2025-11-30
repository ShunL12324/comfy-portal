import { NumberInput } from '@/components/self-ui/number-input';
import { useWorkflowStore } from '@/features/workflow/stores/workflow-store';
import { Node } from '@/features/workflow/types';
import BaseNode from '../../common/base-node';
import SubItem from '../../common/sub-item';
interface ModelSamplingFluxProps {
  node: Node;
  serverId: string;
  workflowId: string;
}

export default function ModelSamplingFlux({ node, serverId, workflowId }: ModelSamplingFluxProps) {
  const updateNodeInput = useWorkflowStore((state) => state.updateNodeInput);
  return (
    <BaseNode node={node}>
      <SubItem title="max_shift">
        <NumberInput
          defaultValue={node.inputs.max_shift}
          minValue={0}
          maxValue={100}
          step={0.05}
          onChange={(value) => updateNodeInput(workflowId, node.id, 'max_shift', Number(value))}
          decimalPlaces={2}
        />
      </SubItem>
      <SubItem title="base_shift">
        <NumberInput
          defaultValue={node.inputs.base_shift}
          minValue={0}
          maxValue={100}
          step={0.05}
          onChange={(value) => updateNodeInput(workflowId, node.id, 'base_shift', Number(value))}
          decimalPlaces={2}
        />
      </SubItem>
    </BaseNode>
  );
}
