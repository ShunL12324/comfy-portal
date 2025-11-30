import { OptionSelector } from '@/components/common/selectors/option-selector';
import { Input, InputField } from '@/components/ui/input';
import { useWorkflowStore } from '@/features/workflow/stores/workflow-store';
import { Node } from '@/features/workflow/types';
import BaseNode from '../../common/base-node';
import SubItem from '../../common/sub-item';

interface ImageResizeKJv2Props {
  node: Node;
  serverId: string;
  workflowId: string;
}

export default function ImageResizeKJv2({ node, workflowId }: ImageResizeKJv2Props) {
  const updateNodeInput = useWorkflowStore((state) => state.updateNodeInput);

  const upscaleMethods = [
    { label: 'nearest-exact', value: 'nearest-exact' },
    { label: 'bilinear', value: 'bilinear' },
    { label: 'area', value: 'area' },
    { label: 'bicubic', value: 'bicubic' },
    { label: 'lanczos', value: 'lanczos' },
  ];

  return (
    <BaseNode node={node}>
      <SubItem title="Width">
        <Input className="flex-1 rounded-md border-0 bg-background-50" variant="outline" size="sm">
          <InputField
            placeholder="Width"
            keyboardType="numeric"
            value={typeof node.inputs.width === 'number' ? node.inputs.width.toString() : ''}
            onChangeText={(text) => updateNodeInput(workflowId, node.id, 'width', Number(text))}
          />
        </Input>
      </SubItem>
      <SubItem title="Height">
        <Input className="flex-1 rounded-md border-0 bg-background-50" variant="outline" size="sm">
          <InputField
            placeholder="Height"
            keyboardType="numeric"
            value={typeof node.inputs.height === 'number' ? node.inputs.height.toString() : ''}
            onChangeText={(text) => updateNodeInput(workflowId, node.id, 'height', Number(text))}
          />
        </Input>
      </SubItem>
      <SubItem title="Upscale Method">
        <OptionSelector
          value={node.inputs.upscale_method}
          onChange={(value) => updateNodeInput(workflowId, node.id, 'upscale_method', value)}
          options={upscaleMethods}
          title="Select Upscale Method"
        />
      </SubItem>
      <SubItem title="Keep Proportion">
        <OptionSelector
          value={node.inputs.keep_proportion}
          onChange={(value) => updateNodeInput(workflowId, node.id, 'keep_proportion', value)}
          options={[
            { label: 'stretch', value: 'stretch' },
            { label: 'resize', value: 'resize' },
            { label: 'pad', value: 'pad' },
            { label: 'pad_edge', value: 'pad_edge' },
            { label: 'pad_edge_pixel', value: 'pad_edge_pixel' },
            { label: 'crop', value: 'crop' },
            { label: 'pillarbox_blur', value: 'pillarbox_blur' },
            { label: 'total_pixels', value: 'total_pixels' },
          ]}
          title="Select Keep Proportion"
        />
      </SubItem>
      <SubItem title="Divisible By">
        <Input className="flex-1 rounded-md border-0 bg-background-50" variant="outline" size="sm">
          <InputField
            placeholder="Divisible By"
            keyboardType="numeric"
            value={node.inputs.divisible_by?.toString()}
            onChangeText={(text) => updateNodeInput(workflowId, node.id, 'divisible_by', Number(text))}
          />
        </Input>
      </SubItem>
      <SubItem title="Crop Position">
        <OptionSelector
          value={node.inputs.crop_position}
          onChange={(value) => updateNodeInput(workflowId, node.id, 'crop_position', value)}
          options={[
            { label: 'center', value: 'center' },
            { label: 'top', value: 'top' },
            { label: 'bottom', value: 'bottom' },
            { label: 'left', value: 'left' },
            { label: 'right', value: 'right' },
          ]}
          title="Select Crop Position"
        />
      </SubItem>
      <SubItem title="Device">
        <OptionSelector
          value={node.inputs.device}
          onChange={(value) => updateNodeInput(workflowId, node.id, 'device', value)}
          options={[
            { label: 'cpu', value: 'cpu' },
            { label: 'gpu', value: 'gpu' },
          ]}
          title="Select Device"
        />
      </SubItem>
    </BaseNode>
  );
}
