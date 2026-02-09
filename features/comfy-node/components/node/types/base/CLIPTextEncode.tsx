import { Pressable } from '@/components/ui/pressable';
import { Icon } from '@/components/ui/icon';
import { Textarea, TextareaInput } from '@/components/ui/textarea';
import {
  PromptEditorModal,
  PromptEditorModalRef,
} from '@/features/ai-assistant/components/prompt-editor-modal';
import { useWorkflowStore } from '@/features/workflow/stores/workflow-store';
import { Node } from '@/features/workflow/types';
import { Maximize2 } from 'lucide-react-native';
import { useCallback, useRef } from 'react';
import { View } from 'react-native';
import BaseNode from '../../common/base-node';
import SubItem from '../../common/sub-item';

interface CLIPTextEncodeProps {
  node: Node;
  serverId: string;
  workflowId: string;
}

export default function CLIPTextEncode({ node, serverId, workflowId }: CLIPTextEncodeProps) {
  const updateNodeInput = useWorkflowStore((state) => state.updateNodeInput);
  const promptEditorRef = useRef<PromptEditorModalRef>(null);

  const handleTextChange = (text: string) => {
    updateNodeInput(workflowId, node.id, 'text', text);
  };

  const handleOpenEditor = useCallback(() => {
    promptEditorRef.current?.present({
      initialValue: node.inputs?.text || '',
      onSave: (value) => {
        handleTextChange(value);
      },
      title: 'Edit Prompt',
    });
  }, [node.inputs?.text]);

  return (
    <BaseNode node={node}>
      <SubItem
        title="Text"
        rightComponent={
          <View className="flex-row items-center gap-2">
            <Pressable onPress={handleOpenEditor} className="p-1">
              <Icon as={Maximize2} size="sm" className="text-typography-500" />
            </Pressable>
          </View>
        }
        node={node}
        dependencies={['text']}
      >
        <Textarea
          size="sm"
          isReadOnly={false}
          isInvalid={false}
          isDisabled={false}
          className="w-full rounded-md border-0 bg-background-50"
        >
          <TextareaInput
            placeholder="Enter text here..."
            value={node.inputs?.text || ''}
            onChangeText={handleTextChange}
            className="text-sm"
          />
        </Textarea>
      </SubItem>
      <PromptEditorModal ref={promptEditorRef} />
    </BaseNode>
  );
}
