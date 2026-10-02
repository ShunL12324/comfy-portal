import { useWorkflowStore } from '@/features/workflow/stores/workflow-store';
import { useNodeSchema } from '@/hooks/use-node-schema';
import BaseNode from '../../common/base-node';
import { NodeEditorProps } from '../../common/schema-node';
import ServerAudioField from '../../common/server-audio-field';

/**
 * Core Load Audio (`comfy_extras/nodes_audio.py`): one input, `audio`,
 * listing the audio and video files in `input/` (it takes a video's sound).
 */
export default function LoadAudio({ node, serverId, workflowId }: NodeEditorProps) {
  const updateNodeInput = useWorkflowStore((state) => state.updateNodeInput);
  const schema = useNodeSchema(serverId, node.class_type);
  return (
    <BaseNode node={node}>
      <ServerAudioField
        node={node}
        serverId={serverId}
        schema={schema}
        inputKey="audio"
        title="Audio"
        onChange={(filename) => updateNodeInput(workflowId, node.id, 'audio', filename)}
      />
    </BaseNode>
  );
}
