import { NativeSegments } from '@/components/ui/design-system/native-controls';
import { useWorkflowStore } from '@/features/workflow/stores/workflow-store';
import { Node } from '@/features/workflow/types';
import BaseNode from '../../common/base-node';
import SubItem from '../../common/sub-item';

interface CLIPVisionEncodeProps {
  node: Node;
  serverId: string;
  workflowId: string;
}

export default function CLIPVisionEncode({ node, workflowId }: CLIPVisionEncodeProps) {
  const updateNodeInput = useWorkflowStore((state) => state.updateNodeInput);

  return (
    <BaseNode node={node}>
      <SubItem title="Crop">
        <NativeSegments
          label="Crop"
          options={['none', 'center']}
          value={node.inputs.crop}
          onChange={(value) => updateNodeInput(workflowId, node.id, 'crop', value)}
        />
      </SubItem>
    </BaseNode>
  );
}
