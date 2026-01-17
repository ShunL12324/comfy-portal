import { NumberInput } from '@/components/self-ui/number-input';
import { Textarea, TextareaInput } from '@/components/ui/textarea';
import { useWorkflowStore } from '@/features/workflow/stores/workflow-store';
import { Node } from '@/features/workflow/types';
import BaseNode from '../../common/base-node';
import SubItem from '../../common/sub-item';

interface CLIPTextEncodeSDXLNodeProps {
  node: Node;
  serverId: string;
  workflowId: string;
}

export default function CLIPTextEncodeSDXL({ node, serverId, workflowId }: CLIPTextEncodeSDXLNodeProps) {
  const updateNodeInput = useWorkflowStore((state) => state.updateNodeInput);
  return (
    <BaseNode node={node}>
      <SubItem title="width" node={node} dependencies={['width']}>
        <NumberInput
          defaultValue={node.inputs.width}
          onChange={(value) => {
            updateNodeInput(workflowId, node.id, 'width', value);
          }}
          minValue={0}
          maxValue={10000}
          step={1}
        />
      </SubItem>
      <SubItem title="height" node={node} dependencies={['height']}>
        <NumberInput
          defaultValue={node.inputs.height}
          onChange={(value) => {
            updateNodeInput(workflowId, node.id, 'height', value);
          }}
          minValue={0}
          maxValue={10000}
          step={1}
        />
      </SubItem>
      <SubItem title="crop_w" node={node} dependencies={['crop_w']}>
        <NumberInput
          defaultValue={node.inputs.crop_w}
          onChange={(value) => {
            updateNodeInput(workflowId, node.id, 'crop_w', value);
          }}
          minValue={0}
          maxValue={10000}
          step={1}
        />
      </SubItem>
      <SubItem title="crop_h" node={node} dependencies={['crop_h']}>
        <NumberInput
          defaultValue={node.inputs.crop_h}
          onChange={(value) => {
            updateNodeInput(workflowId, node.id, 'crop_h', value);
          }}
          minValue={0}
          maxValue={10000}
          step={1}
        />
      </SubItem>
      <SubItem title="target_width" node={node} dependencies={['target_width']}>
        <NumberInput
          defaultValue={node.inputs.target_width}
          onChange={(value) => {
            updateNodeInput(workflowId, node.id, 'target_width', value);
          }}
          minValue={0}
          maxValue={10000}
          step={1}
        />
      </SubItem>
      <SubItem title="target_height" node={node} dependencies={['target_height']}>
        <NumberInput
          defaultValue={node.inputs.target_height}
          onChange={(value) => {
            updateNodeInput(workflowId, node.id, 'target_height', value);
          }}
          minValue={0}
          maxValue={10000}
          step={1}
        />
      </SubItem>
      <SubItem title="text_g" node={node} dependencies={['text_g']}>
        <Textarea size="md" className="flex-1 rounded-lg border-0 bg-background-50">
          <TextareaInput
            defaultValue={node.inputs.text_g}
            onChangeText={(text) => updateNodeInput(workflowId, node.id, 'text_g', text)}
            size="sm"
            placeholder="Your text goes here..."
          />
        </Textarea>
      </SubItem>
      <SubItem title="text_l" node={node} dependencies={['text_l']}>
        <Textarea size="md" className="flex-1 rounded-lg border-0 bg-background-50">
          <TextareaInput
            defaultValue={node.inputs.text_l}
            onChangeText={(text) => updateNodeInput(workflowId, node.id, 'text_l', text)}
            size="sm"
            placeholder="Your text goes here..."
          />
        </Textarea>
      </SubItem>
    </BaseNode>
  );
}
