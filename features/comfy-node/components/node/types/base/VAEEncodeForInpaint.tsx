import { NumberSlider } from '@/components/self-ui/slider';
import { useWorkflowStore } from '@/features/workflow/stores/workflow-store';
import { Node } from '@/features/workflow/types';
import BaseNode from '../../common/base-node';
import SubItem from '../../common/sub-item';

interface VAEEncodeForInpaintNodeProps {
  node: Node;
  serverId: string;
  workflowId: string;
}

export default function VAEEncodeForInpaint({ node, serverId, workflowId }: VAEEncodeForInpaintNodeProps) {
  const updateNodeInput = useWorkflowStore((state) => state.updateNodeInput);
  return (
    <BaseNode node={node}>
      <SubItem title="grow_mask_by" node={node} dependencies={['grow_mask_by']}>
        <NumberSlider
          defaultValue={node.inputs.grow_mask_by}
          onChange={(value) => {
            updateNodeInput(workflowId, node.id, 'grow_mask_by', value);
          }}
          minValue={0}
          maxValue={64}
          step={1}
          space={12}
        />
      </SubItem>
    </BaseNode>
  );
}
