import { ModelSelector } from '@/components/selectors/model';
import { OptionSelector } from '@/components/selectors/option-selector';
import { useWorkflowStore } from '@/store/workflow';
import { Node } from '@/types/workflow';
import BaseNode from '../../common/base-node';
import SubItem from '../../common/sub-item';
interface UNETLoaderProps {
  node: Node;
  serverId: string;
  workflowId: string;
}

export default function UNETLoader({ node, serverId, workflowId }: UNETLoaderProps) {
  const updateNodeInput = useWorkflowStore((state) => state.updateNodeInput);
  return (
    <BaseNode node={node}>
      <ModelSelector
        value={node.inputs.unet_name}
        onChange={(model) => {
          updateNodeInput(workflowId, node.id, 'unet_name', model);
        }}
        type="diffusion_models"
        serverId={serverId}
      />
      <SubItem title="Weight Dtype">
        <OptionSelector
          value={node.inputs.weight_dtype}
          onChange={(value) => {
            updateNodeInput(workflowId, node.id, 'weight_dtype', value);
          }}
          options={[
            {
              value: 'default',
              label: 'Default',
            },
            {
              value: 'fp8_e4m3fn',
              label: 'fp8_e4m3fn',
            },
            {
              value: 'fp8_e4m3fn_fast',
              label: 'fp8_e4m3fn_fast',
            },
            {
              value: 'fp8_e5m2',
              label: 'fp8_e5m2',
            },
          ]}
        />
      </SubItem>
    </BaseNode>
  );
}
