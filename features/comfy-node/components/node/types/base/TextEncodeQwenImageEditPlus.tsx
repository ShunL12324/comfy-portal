import { BottomSheetTextarea } from '@/components/self-ui/bottom-sheet-textarea';
import { useWorkflowStore } from '@/features/workflow/stores/workflow-store';
import { Node } from '@/features/workflow/types';
import BaseNode from '../../common/base-node';
import SubItem from '../../common/sub-item';

interface TextEncodeQwenImageEditPlusProps {
  node: Node;
  serverId: string;
  workflowId: string;
}

export default function TextEncodeQwenImageEditPlus({
  node,
  workflowId,
}: TextEncodeQwenImageEditPlusProps) {
  const updateNodeInput = useWorkflowStore((state) => state.updateNodeInput);

  return (
    <BaseNode node={node}>
      <SubItem title="Prompt" node={node} dependencies={['prompt']}>
        <BottomSheetTextarea
          placeholder="Enter prompt here..."
          value={node.inputs?.prompt || ''}
          onChangeText={(text) => updateNodeInput(workflowId, node.id, 'prompt', text)}
        />
      </SubItem>
    </BaseNode>
  );
}
