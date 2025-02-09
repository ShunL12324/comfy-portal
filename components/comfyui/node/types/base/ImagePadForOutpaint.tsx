import { NumberInput } from '@/components/self-ui/number-input';
import { useWorkflowStore } from '@/store/workflow';
import { Node } from '@/types/workflow';
import BaseNode from '../../common/base-node';
import SubItem from '../../common/sub-item';

interface ImagePadForOutpaintNodeProps {
  node: Node;
  serverId: string;
  workflowId: string;
}

export default function ImagePadForOutpaint({ node, serverId, workflowId }: ImagePadForOutpaintNodeProps) {
  const updateNodeInput = useWorkflowStore((state) => state.updateNodeInput);
  return (
    <BaseNode node={node}>
      <SubItem title="left" node={node} dependencies={['left']}>
        <NumberInput
          defaultValue={node.inputs.left}
          onChange={(value) => {
            updateNodeInput(workflowId, node.id, 'left', value);
          }}
          step={1}
          minValue={0}
          maxValue={16384}
        />
      </SubItem>
      <SubItem title="top" node={node} dependencies={['top']}>
        <NumberInput
          defaultValue={node.inputs.top}
          onChange={(value) => {
            updateNodeInput(workflowId, node.id, 'top', value);
          }}
          step={1}
          minValue={0}
          maxValue={16384}
        />
      </SubItem>
      <SubItem title="right" node={node} dependencies={['right']}>
        <NumberInput
          defaultValue={node.inputs.right}
          onChange={(value) => {
            updateNodeInput(workflowId, node.id, 'right', value);
          }}
          step={1}
          minValue={0}
          maxValue={16384}
        />
      </SubItem>
      <SubItem title="bottom" node={node} dependencies={['bottom']}>
        <NumberInput
          defaultValue={node.inputs.bottom}
          onChange={(value) => {
            updateNodeInput(workflowId, node.id, 'bottom', value);
          }}
          step={1}
          minValue={0}
          maxValue={16384}
        />
      </SubItem>
      <SubItem title="feathering" node={node} dependencies={['feathering']}>
        <NumberInput
          defaultValue={node.inputs.feathering}
          onChange={(value) => {
            updateNodeInput(workflowId, node.id, 'feathering', value);
          }}
          step={1}
          minValue={0}
          maxValue={16384}
        />
      </SubItem>
    </BaseNode>
  );
}
