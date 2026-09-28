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
import { designTokens as t } from '@/constants/design-tokens';

interface TextEncodeQwenImageEditPlusProps {
  node: Node;
  serverId: string;
  workflowId: string;
}

export default function TextEncodeQwenImageEditPlus({ node, workflowId }: TextEncodeQwenImageEditPlusProps) {
  const updateNodeInput = useWorkflowStore((state) => state.updateNodeInput);
  const promptEditorRef = useRef<PromptEditorModalRef>(null);

  const handleTextChange = useCallback(
    (text: string) => {
      updateNodeInput(workflowId, node.id, 'prompt', text);
    },
    [workflowId, node.id, updateNodeInput],
  );

  const handleOpenEditor = useCallback(() => {
    promptEditorRef.current?.present({
      initialValue: node.inputs?.prompt || '',
      onSave: handleTextChange,
      title: 'Edit Prompt',
    });
  }, [node.inputs?.prompt, handleTextChange]);

  return (
    <BaseNode node={node}>
      <SubItem
        title="Prompt"
        node={node}
        dependencies={['prompt']}
        rightComponent={
          <Pressable onPress={handleOpenEditor} className="p-1" accessibilityLabel="Expand prompt" hitSlop={11}>
            <Icon as={Maximize2} size="sm" className="text-content-secondary" />
          </Pressable>
        }
      >
        <Textarea
          size="sm"
          className="bg-well w-full border-0"
          style={{ borderRadius: t.radius.control, height: t.node.promptHeight }}
        >
          <TextareaInput
            aria-label="Prompt"
            placeholder="Enter prompt here..."
            value={node.inputs?.prompt || ''}
            onChangeText={handleTextChange}
            style={{ paddingHorizontal: t.layout.rowX, paddingVertical: t.layout.rowY }}
          />
        </Textarea>
      </SubItem>
      <PromptEditorModal ref={promptEditorRef} />
    </BaseNode>
  );
}
