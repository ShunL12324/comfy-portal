import { OptionSelector } from '@/components/common/selectors/option-selector';
import { useWorkflowStore } from '@/features/workflow/stores/workflow-store';
import { Node } from '@/features/workflow/types';
import { useNodeSchema } from '@/hooks/use-node-schema';
import BaseNode from '../../common/base-node';
import SchemaField from '../../common/schema-field';
import SubItem from '../../common/sub-item';
import { CORE_NUMBER_SPECS } from './core-number-specs';

interface ImageScaleByProps {
  node: Node;
  serverId: string;
  workflowId: string;
}

export default function ImageScaleBy({ node, serverId, workflowId }: ImageScaleByProps) {
  const updateNodeInput = useWorkflowStore((state) => state.updateNodeInput);
  const schema = useNodeSchema(serverId, node.class_type);

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
      <SchemaField
        node={node}
        serverId={serverId}
        workflowId={workflowId}
        schema={schema}
        inputKey="scale_by"
        title="Scale By"
        fallback={CORE_NUMBER_SPECS.ImageScaleBy.scale_by}
      />
    </BaseNode>
  );
}
