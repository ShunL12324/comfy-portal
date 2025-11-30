import { SchedulerSelector } from '@/components/common/selectors/scheduler';
import { NumberSlider } from '@/components/self-ui/slider';
import { useWorkflowStore } from '@/features/workflow/stores/workflow-store';
import { Node } from '@/features/workflow/types';
import BaseNode from '../../common/base-node';
import SubItem from '../../common/sub-item';

interface BasicSchedulerProps {
  node: Node;
  serverId: string;
  workflowId: string;
}

export default function BasicScheduler({ node, serverId, workflowId }: BasicSchedulerProps) {
  const updateNodeInput = useWorkflowStore((state) => state.updateNodeInput);
  return (
    <BaseNode node={node}>
      <SubItem title="scheduler" node={node} dependencies={['scheduler']}>
        <SchedulerSelector
          value={node.inputs.scheduler}
          onChange={(value) => {
            updateNodeInput(workflowId, node.id, 'scheduler', value);
          }}
        />
      </SubItem>
      <SubItem title="steps" node={node} dependencies={['steps']}>
        <NumberSlider
          defaultValue={node.inputs.steps}
          minValue={1}
          maxValue={100}
          step={1}
          onChangeEnd={(value) => updateNodeInput(workflowId, node.id, 'steps', Number(value))}
          space={12}
          decimalPlaces={0}
        />
      </SubItem>
      <SubItem title="denoise" node={node} dependencies={['denoise']}>
        <NumberSlider
          defaultValue={node.inputs.denoise}
          minValue={0}
          maxValue={1}
          step={0.01}
          onChangeEnd={(value) => updateNodeInput(workflowId, node.id, 'denoise', Number(value))}
          space={12}
          decimalPlaces={2}
        />
      </SubItem>
    </BaseNode>
  );
}
