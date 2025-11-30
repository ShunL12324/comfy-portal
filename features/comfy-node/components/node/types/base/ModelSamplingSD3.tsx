import { NumberSlider } from '@/components/self-ui/slider';
import { useWorkflowStore } from '@/features/workflow/stores/workflow-store';
import { Node } from '@/features/workflow/types';
import BaseNode from '../../common/base-node';
import SubItem from '../../common/sub-item';

interface ModelSamplingSD3Props {
  node: Node;
  serverId: string;
  workflowId: string;
}

export default function ModelSamplingSD3({ node, workflowId }: ModelSamplingSD3Props) {
  const updateNodeInput = useWorkflowStore((state) => state.updateNodeInput);

  return (
    <BaseNode node={node}>
      <SubItem title="Shift">
        <NumberSlider
          defaultValue={node.inputs.shift}
          minValue={0}
          maxValue={100}
          step={0.1}
          onChangeEnd={(value) => updateNodeInput(workflowId, node.id, 'shift', Number(value))}
          space={12}
          decimalPlaces={1}
        />
      </SubItem>
    </BaseNode>
  );
}
