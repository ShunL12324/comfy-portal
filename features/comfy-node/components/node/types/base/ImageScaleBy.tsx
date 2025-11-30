import { OptionSelector } from '@/components/common/selectors/option-selector';
import { NumberSlider } from '@/components/self-ui/slider';
import { useWorkflowStore } from '@/features/workflow/stores/workflow-store';
import { Node } from '@/features/workflow/types';
import BaseNode from '../../common/base-node';
import SubItem from '../../common/sub-item';

interface ImageScaleByProps {
  node: Node;
  serverId: string;
  workflowId: string;
}

export default function ImageScaleBy({ node, workflowId }: ImageScaleByProps) {
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
      <SubItem title="Upscale Method">
        <OptionSelector
          value={node.inputs.upscale_method}
          onChange={(value) => updateNodeInput(workflowId, node.id, 'upscale_method', value)}
          options={upscaleMethods}
          title="Select Upscale Method"
        />
      </SubItem>
      <SubItem title="Scale By">
        <NumberSlider
          defaultValue={node.inputs.scale_by}
          minValue={0.1}
          maxValue={8}
          step={0.05}
          onChangeEnd={(value) => updateNodeInput(workflowId, node.id, 'scale_by', Number(value))}
          space={12}
          decimalPlaces={2}
        />
      </SubItem>
    </BaseNode>
  );
}
