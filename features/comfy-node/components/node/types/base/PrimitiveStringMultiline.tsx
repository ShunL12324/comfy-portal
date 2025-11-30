import { Textarea, TextareaInput } from '@/components/ui/textarea';
import { useWorkflowStore } from '@/features/workflow/stores/workflow-store';
import { Node } from '@/features/workflow/types';
import BaseNode from '../../common/base-node';
import SubItem from '../../common/sub-item';

interface PrimitiveStringMultilineProps {
  node: Node;
  serverId: string;
  workflowId: string;
}

export default function PrimitiveStringMultiline({ node, workflowId }: PrimitiveStringMultilineProps) {
  const updateNodeInput = useWorkflowStore((state) => state.updateNodeInput);

  const handleTextChange = (text: string) => {
    updateNodeInput(workflowId, node.id, 'value', text);
  };

  return (
    <BaseNode node={node}>
      <SubItem title="Value">
        <Textarea
          size="sm"
          isReadOnly={false}
          isInvalid={false}
          isDisabled={false}
          className="w-full rounded-md border-0 bg-background-50"
        >
          <TextareaInput
            placeholder="Enter text here..."
            value={node.inputs?.value || ''}
            onChangeText={handleTextChange}
            className="text-sm"
          />
        </Textarea>
      </SubItem>
    </BaseNode>
  );
}
