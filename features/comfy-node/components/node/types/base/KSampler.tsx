
import { SamplerSelector } from '@/components/common/selectors/sampler';
import { SchedulerSelector } from '@/components/common/selectors/scheduler';
import { NumberSlider } from '@/components/self-ui/slider';
import { useWorkflowStore } from '@/features/workflow/stores/workflow-store';
import { Node } from '@/features/workflow/types';
import BaseNode from '../../common/base-node';
import SeedControl from '../../common/seed-control';
import SubItem from '../../common/sub-item';

interface KSamplerProps {
  node: Node;
  serverId: string;
  workflowId: string;
}
export default function KSampler({ node, workflowId }: KSamplerProps) {
  const updateNodeInput = useWorkflowStore((state) => state.updateNodeInput);

  return (
    <BaseNode node={node}>
      <SeedControl node={node} workflowId={workflowId} inputKey="seed" title="Seed" />
      <SubItem title="Steps">
        <NumberSlider
          value={node.inputs.steps}
          minValue={1}
          maxValue={100}
          step={1}
          onChangeEnd={(value) => updateNodeInput(workflowId, node.id, 'steps', Number(value))}
          space={12}
        />
      </SubItem>
      <SubItem title="CFG">
        <NumberSlider
          value={node.inputs.cfg}
          minValue={1}
          maxValue={30}
          step={0.5}
          onChangeEnd={(value) => updateNodeInput(workflowId, node.id, 'cfg', Number(value))}
          space={12}
          decimalPlaces={1}
        />
      </SubItem>
      <SubItem title="Sampler">
        <SamplerSelector
          value={node.inputs.sampler_name}
          onChange={(value) => updateNodeInput(workflowId, node.id, 'sampler_name', value)}
        />
      </SubItem>
      <SubItem title="Scheduler">
        <SchedulerSelector
          value={node.inputs.scheduler}
          onChange={(value) => updateNodeInput(workflowId, node.id, 'scheduler', value)}
        />
      </SubItem>
      <SubItem title="Denoise">
        <NumberSlider
          value={node.inputs.denoise}
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
