import { ModelSelector } from '@/components/common/selectors/model';
import { useWorkflowStore } from '@/features/workflow/stores/workflow-store';
import { Node } from '@/features/workflow/types';
import BaseNode from '../../common/base-node';
import SubItem from '../../common/sub-item';

interface MiniMaxH3EasyLoaderProps {
  node: Node;
  serverId: string;
  workflowId: string;
}

/**
 * Loads the five models the H3 bundle needs.
 *
 * Either transformer may be left unset (the extension only requires one of
 * them), which shows up here as whatever "none" entry the server offers.
 */
export default function MiniMaxH3EasyLoader({ node, serverId, workflowId }: MiniMaxH3EasyLoaderProps) {
  const updateNodeInput = useWorkflowStore((state) => state.updateNodeInput);

  return (
    <BaseNode node={node}>
      <SubItem title="FL2VA Transformer" node={node} dependencies={['fl2va_model']}>
        <ModelSelector
          value={node.inputs.fl2va_model}
          onChange={(model) => updateNodeInput(workflowId, node.id, 'fl2va_model', model)}
          type="diffusion_models"
          classType={node.class_type}
          inputName="fl2va_model"
          serverId={serverId}
        />
      </SubItem>

      <SubItem title="Ref2VA Transformer" node={node} dependencies={['ref2va_model']}>
        <ModelSelector
          value={node.inputs.ref2va_model}
          onChange={(model) => updateNodeInput(workflowId, node.id, 'ref2va_model', model)}
          type="diffusion_models"
          classType={node.class_type}
          inputName="ref2va_model"
          serverId={serverId}
        />
      </SubItem>

      <SubItem title="Text Encoder" node={node} dependencies={['text_encoder']}>
        <ModelSelector
          value={node.inputs.text_encoder}
          onChange={(model) => updateNodeInput(workflowId, node.id, 'text_encoder', model)}
          type="text_encoders"
          classType={node.class_type}
          inputName="text_encoder"
          serverId={serverId}
        />
      </SubItem>

      <SubItem title="Video VAE" node={node} dependencies={['video_vae']}>
        <ModelSelector
          value={node.inputs.video_vae}
          onChange={(model) => updateNodeInput(workflowId, node.id, 'video_vae', model)}
          type="vae"
          classType={node.class_type}
          inputName="video_vae"
          serverId={serverId}
        />
      </SubItem>

      <SubItem title="Audio VAE" node={node} dependencies={['audio_vae']}>
        <ModelSelector
          value={node.inputs.audio_vae}
          onChange={(model) => updateNodeInput(workflowId, node.id, 'audio_vae', model)}
          type="vae"
          classType={node.class_type}
          inputName="audio_vae"
          serverId={serverId}
        />
      </SubItem>
    </BaseNode>
  );
}
