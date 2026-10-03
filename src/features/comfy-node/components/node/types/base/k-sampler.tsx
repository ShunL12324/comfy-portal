import { SamplerSelector } from '@/components/common/selectors/sampler';
import { SchedulerSelector } from '@/components/common/selectors/scheduler';
import { useWorkflowStore } from '@/features/workflow/stores/workflow-store';
import { Node } from '@/features/workflow/types';
import { useNodeSchema } from '@/hooks/use-node-schema';
import BaseNode from '../../common/base-node';
import SchemaField from '../../common/schema-field';
import SeedControl from '../../common/seed-control';
import SubItem from '../../common/sub-item';
import { CORE_NUMBER_SPECS } from './core-number-specs';

const SPECS = CORE_NUMBER_SPECS.KSampler;

interface KSamplerProps {
  node: Node;
  serverId: string;
  workflowId: string;
}
export default function KSampler({ node, serverId, workflowId }: KSamplerProps) {
  const updateNodeInput = useWorkflowStore((state) => state.updateNodeInput);
  const schema = useNodeSchema(serverId, node.class_type);
  const shared = { node, serverId, workflowId, schema };

  return (
    <BaseNode node={node}>
      <SeedControl node={node} workflowId={workflowId} inputKey="seed" title="Seed" />
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
      <SchemaField {...shared} inputKey="denoise" title="Denoise" fallback={SPECS.denoise} />
    </BaseNode>
  );
}
