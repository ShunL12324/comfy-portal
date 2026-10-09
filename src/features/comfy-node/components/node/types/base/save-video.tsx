import { useCallback } from 'react';
import { FieldSpec, dynamicComboUpdates } from '@/features/comfy-node/utils/schema-inputs';
import { useWorkflowStore } from '@/features/workflow/stores/workflow-store';
import { useNodeSchema } from '@/hooks/use-node-schema';
import SchemaNode, { NodeEditorProps, SchemaFieldDef } from '../../common/schema-node';

const CODEC = (options: string[]): FieldSpec => ({ kind: 'combo', options, default: 'auto' });

/** `comfy_extras/nodes_video.py`: each container brings the codecs it can hold, as `format.codec`. */
const FORMAT_CHILDREN: Record<string, Record<string, FieldSpec>> = {
  auto: { codec: CODEC(['auto', 'h264', 'av1']) },
  mp4: { codec: CODEC(['auto', 'h264', 'av1']) },
  mkv: { codec: CODEC(['auto', 'h264', 'av1']) },
  webm: { codec: CODEC(['auto', 'av1']) },
};

const LABELS = { auto: 'Auto', mp4: 'MP4', mkv: 'MKV', webm: 'WebM', h264: 'H.264', av1: 'AV1' };

export default function SaveVideo(props: NodeEditorProps) {
  const { node, serverId, workflowId } = props;
  const updateNodeInput = useWorkflowStore((state) => state.updateNodeInput);
  const formatSpec = useNodeSchema(serverId, node.class_type)?.inputs.format;
  const children = (formatSpec?.kind === 'combo' && formatSpec.children) || FORMAT_CHILDREN;

  // A codec the new container can't hold (H.264 in WebM) falls back to Auto, which every container has.
  const changeFormat = useCallback(
    (next: unknown) => {
      if (typeof next !== 'string') return;
      const updates = dynamicComboUpdates(node.inputs, 'format', next, children);
      const codecSpec = children[next]?.codec;
      const codec = updates['format.codec'] ?? node.inputs['format.codec'];
      if (codecSpec?.kind === 'combo' && typeof codec === 'string' && !codecSpec.options.includes(codec))
        updates['format.codec'] = 'auto';
      for (const [key, value] of Object.entries(updates)) updateNodeInput(workflowId, node.id, key, value);
    },
    [node.inputs, node.id, children, updateNodeInput, workflowId],
  );

  const fields: SchemaFieldDef[] = [
    {
      inputKey: 'filename_prefix',
      title: 'Filename Prefix',
      fallback: { kind: 'string', multiline: false, default: 'video/ComfyUI' },
      hint: 'Only names the file stored on the server.',
    },
    {
      inputKey: 'format',
      title: 'Format',
      fallback: { kind: 'combo', options: Object.keys(FORMAT_CHILDREN) },
      labels: LABELS,
      onChange: changeFormat,
    },
    {
      inputKey: 'format.codec',
      title: 'Codec',
      advanced: true,
      fallback: FORMAT_CHILDREN.auto.codec,
      labels: LABELS,
    },
  ];
  return <SchemaNode {...props} fields={fields} />;
}
