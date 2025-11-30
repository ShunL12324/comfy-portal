import { ModelSelector } from '@/components/common/selectors/model';
import { OptionSelector } from '@/components/common/selectors/option-selector';
import { useWorkflowStore } from '@/features/workflow/stores/workflow-store';
import { Node } from '@/features/workflow/types';
import BaseNode from '../../common/base-node';
import SubItem from '../../common/sub-item';

interface CLIPLoaderProps {
  node: Node;
  serverId: string;
  workflowId: string;
}

export default function CLIPLoader({ node, serverId, workflowId }: CLIPLoaderProps) {
  const updateNodeInput = useWorkflowStore((state) => state.updateNodeInput);

  const typeOptions = [
    { label: 'stable_diffusion', value: 'stable_diffusion' },
    { label: 'stable_cascade', value: 'stable_cascade' },
    { label: 'sd3', value: 'sd3' },
    { label: 'stable_audio', value: 'stable_audio' },
    { label: 'mochi', value: 'mochi' },
    { label: 'ltxv', value: 'ltxv' },
    { label: 'pixart', value: 'pixart' },
    { label: 'cosmos', value: 'cosmos' },
    { label: 'lumina2', value: 'lumina2' },
    { label: 'wan', value: 'wan' },
    { label: 'hidream', value: 'hidream' },
    { label: 'chroma', value: 'chroma' },
    { label: 'ace', value: 'ace' },
    { label: 'omnigen2', value: 'omnigen2' },
    { label: 'qwen_image', value: 'qwen_image' },
    { label: 'hunyuan_image', value: 'hunyuan_image' },
    { label: 'flux2', value: 'flux2' },
  ];

  return (
    <BaseNode node={node}>
      <ModelSelector
        value={node.inputs.clip_name}
        onChange={(model) => {
          updateNodeInput(workflowId, node.id, 'clip_name', model);
        }}
        type={['clip', 'text_encoders']}
        serverId={serverId}
      />
      <SubItem title="Type">
        <OptionSelector
          value={node.inputs.type}
          onChange={(value) => updateNodeInput(workflowId, node.id, 'type', value)}
          options={typeOptions}
          title="Select CLIP Type"
        />
      </SubItem>
      <SubItem title="Device">
        <OptionSelector
          value={node.inputs.device}
          onChange={(value) => updateNodeInput(workflowId, node.id, 'device', value)}
          options={[
            { label: 'default', value: 'default' },
            { label: 'cpu', value: 'cpu' },
          ]}
          title="Select Device"
        />
      </SubItem>
    </BaseNode>
  );
}
