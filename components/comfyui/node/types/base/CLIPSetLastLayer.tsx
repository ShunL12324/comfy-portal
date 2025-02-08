import { NumberInput } from '@/components/self-ui/number-input';
import { useWorkflowStore } from '@/store/workflow';
import { Node } from '@/types/workflow';
import BaseNode from '../../common/base-node';
import SubItem from '../../common/sub-item';

interface CLIPSetLastLayerProps {
  node: Node;
  serverId: string;
  workflowId: string;
}

export default function CLIPSetLastLayer({ node, serverId, workflowId }: CLIPSetLastLayerProps) {
  const updateNodeInput = useWorkflowStore((state) => state.updateNodeInput);
  return (
    <BaseNode node={node}>
      <SubItem title="CLIP Set Last Layer">
        <NumberInput
          defaultValue={node.inputs.stop_at_clip_layer}
          onChange={(value) => {
            updateNodeInput(workflowId, node.id, 'stop_at_clip_layer', value);
          }}
          minValue={-24}
          maxValue={-1}
          step={1}
        />
      </SubItem>
    </BaseNode>
  );
}
