import { SamplerSelector } from '@/components/common/selectors/sampler';
import { SchedulerSelector } from '@/components/common/selectors/scheduler';
import { NativeSwitch } from '@/components/ui/design-system/native-controls';
import { useWorkflowStore } from '@/features/workflow/stores/workflow-store';
import { Node } from '@/features/workflow/types';
import { useNodeSchema } from '@/hooks/use-node-schema';
import BaseNode from '../../common/base-node';
import SchemaField from '../../common/schema-field';
import SeedControl from '../../common/seed-control';
import SubItem from '../../common/sub-item';
import { CORE_NUMBER_SPECS } from './core-number-specs';

const SPECS = CORE_NUMBER_SPECS.KSamplerAdvanced;

interface KSamplerAdvancedProps {
  node: Node;
  serverId: string;
  workflowId: string;
}

export default function KSamplerAdvanced({ node, serverId, workflowId }: KSamplerAdvancedProps) {
  const updateNodeInput = useWorkflowStore((state) => state.updateNodeInput);
  const schema = useNodeSchema(serverId, node.class_type);
  const shared = { node, serverId, workflowId, schema };

  return (
    <BaseNode node={node}>
      <SubItem
        title="Add noise"
        rightComponent={
          <NativeSwitch
            label="Add noise"
            value={node.inputs.add_noise === 'enable'}
            onValueChange={(value: boolean) => {
              updateNodeInput(workflowId, node.id, 'add_noise', value ? 'enable' : 'disable');
            }}
          />
        }
      />
      <SeedControl node={node} workflowId={workflowId} inputKey="noise_seed" title="Noise seed" />
      <SchemaField {...shared} inputKey="steps" title="Steps" fallback={SPECS.steps} />
      <SchemaField {...shared} inputKey="cfg" title="CFG" fallback={SPECS.cfg} />
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
      <SchemaField {...shared} inputKey="start_at_step" title="Start at step" fallback={SPECS.start_at_step} />
      <SchemaField {...shared} inputKey="end_at_step" title="End at step" fallback={SPECS.end_at_step} />
      <SubItem
        title="Return with leftover noise"
        rightComponent={
          <NativeSwitch
            label="Return with leftover noise"
            value={node.inputs.return_with_leftover_noise === 'enable'}
            onValueChange={(value: boolean) =>
              updateNodeInput(workflowId, node.id, 'return_with_leftover_noise', value ? 'enable' : 'disable')
            }
          />
        }
      />
    </BaseNode>
  );
}
