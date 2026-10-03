import { SchedulerSelector } from '@/components/common/selectors/scheduler';
import { useWorkflowStore } from '@/features/workflow/stores/workflow-store';
import { Node } from '@/features/workflow/types';
import { useNodeSchema } from '@/hooks/use-node-schema';
import BaseNode from '../../common/base-node';
import SchemaField from '../../common/schema-field';
import SubItem from '../../common/sub-item';
import { CORE_NUMBER_SPECS } from './core-number-specs';

const SPECS = CORE_NUMBER_SPECS.BasicScheduler;

interface BasicSchedulerProps {
  node: Node;
  serverId: string;
  workflowId: string;
}

export default function BasicScheduler({ node, serverId, workflowId }: BasicSchedulerProps) {
  const updateNodeInput = useWorkflowStore((state) => state.updateNodeInput);
  const schema = useNodeSchema(serverId, node.class_type);
  const shared = { node, serverId, workflowId, schema };
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
      <SchemaField {...shared} inputKey="steps" title="steps" fallback={SPECS.steps} />
      <SchemaField {...shared} inputKey="denoise" title="denoise" fallback={SPECS.denoise} />
    </BaseNode>
  );
}
