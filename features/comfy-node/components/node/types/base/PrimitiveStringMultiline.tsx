import { Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { Textarea, TextareaInput } from '@/components/ui/textarea';
import { PromptEditorModal, PromptEditorModalRef } from '@/features/ai-assistant/components/prompt-editor-modal';
import { useWorkflowStore } from '@/features/workflow/stores/workflow-store';
import { Node } from '@/features/workflow/types';
import { Maximize2 } from '@/constants/icons';
import { useCallback, useRef } from 'react';
import BaseNode from '../../common/base-node';
import SubItem from '../../common/sub-item';

interface PrimitiveStringMultilineProps {
  node: Node;
  serverId: string;
  workflowId: string;
}

export default function PrimitiveStringMultiline({ node, workflowId }: PrimitiveStringMultilineProps) {
  const updateNodeInput = useWorkflowStore((state) => state.updateNodeInput);
  const promptEditorRef = useRef<PromptEditorModalRef>(null);

  const handleTextChange = useCallback(
    (text: string) => {
      updateNodeInput(workflowId, node.id, 'value', text);
    },
    [workflowId, node.id, updateNodeInput],
  );

  const handleOpenEditor = useCallback(() => {
    promptEditorRef.current?.present({
      initialValue: node.inputs?.value || '',
      onSave: handleTextChange,
      title: 'Edit Text',
    });
  }, [node.inputs?.value, handleTextChange]);

  return (
    <BaseNode node={node}>
      <SubItem
        title="Value"
        rightComponent={
          <Pressable onPress={handleOpenEditor} className="p-1" accessibilityLabel="Expand prompt" hitSlop={11}>
            <Icon as={Maximize2} size="sm" className="text-content-secondary" />
          </Pressable>
        }
      >
        <Textarea
          size="sm"
          isReadOnly={false}
          isInvalid={false}
          isDisabled={false}
          className="rounded-md bg-surface-raised w-full border-0"
        >
          <TextareaInput
            placeholder="Enter text here..."
            value={node.inputs?.value || ''}
            onChangeText={handleTextChange}
          />
        </Textarea>
      </SubItem>
      <PromptEditorModal ref={promptEditorRef} />
    </BaseNode>
  );
}
