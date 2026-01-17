import { NumberInput } from '@/components/self-ui/number-input';
import { useWorkflowStore } from '@/features/workflow/stores/workflow-store';
import { Node } from '@/features/workflow/types';
import BaseNode from '../../common/base-node';
import SubItem from '../../common/sub-item';
interface FluxGuidanceProps {
  node: Node;
  serverId: string;
  workflowId: string;
}

export default function FluxGuidance({ node, serverId, workflowId }: FluxGuidanceProps) {
  const updateNodeInput = useWorkflowStore((state) => state.updateNodeInput);
  return (
    <BaseNode node={node}>
      <SubItem title="Guidance">
        <NumberInput
          value={node.inputs.guidance}
          onChange={(value) => {
            updateNodeInput(workflowId, node.id, 'guidance', value);
          }}
          minValue={0}
          maxValue={100}
          step={0.1}
          decimalPlaces={1}
        />
      </SubItem>
    </BaseNode>
  );
}
