import { StyledTextarea } from '@/components/self-ui/styled-textarea';
import { Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import {
  PromptEditorModal,
  PromptEditorModalRef,
} from '@/features/ai-assistant/components/prompt-editor-modal';
import { useWorkflowStore } from '@/features/workflow/stores/workflow-store';
import { Node } from '@/features/workflow/types';
import { Maximize2 } from 'lucide-react-native';
import { useCallback, useRef } from 'react';
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
          <Pressable onPress={handleOpenEditor} className="p-1">
            <Icon as={Maximize2} size="sm" className="text-typography-500" />
          </Pressable>
        }
      >
        <StyledTextarea
          placeholder="Enter prompt here..."
          value={node.inputs?.prompt || ''}
          onChangeText={handleTextChange}
        />
      </SubItem>
      <PromptEditorModal ref={promptEditorRef} />
    </BaseNode>
  );
}
