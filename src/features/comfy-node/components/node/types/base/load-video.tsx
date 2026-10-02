import { useWorkflowStore } from '@/features/workflow/stores/workflow-store';
import { useNodeSchema } from '@/hooks/use-node-schema';
import BaseNode from '../../common/base-node';
import { NodeEditorProps } from '../../common/schema-node';
import ServerVideoField from '../../common/server-video-field';

/**
 * Core Load Video (`comfy_extras/nodes_video.py`): one input, `file`, listing
 * the video files in `input/`. It decodes every frame, so the frame estimate
 * under the name covers the whole file. The preview tile is the VHS loaders'.
 */
export default function LoadVideo({ node, serverId, workflowId }: NodeEditorProps) {
  const updateNodeInput = useWorkflowStore((state) => state.updateNodeInput);
  const schema = useNodeSchema(serverId, node.class_type);
  return (
    <BaseNode node={node}>
      <ServerVideoField
        node={node}
        serverId={serverId}
        schema={schema}
        inputKey="file"
        title="Video"
        onChange={(filename) => updateNodeInput(workflowId, node.id, 'file', filename)}
      />
    </BaseNode>
  );
}
