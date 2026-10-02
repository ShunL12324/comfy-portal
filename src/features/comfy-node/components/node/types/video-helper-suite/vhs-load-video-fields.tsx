import { useWorkflowStore } from '@/features/workflow/stores/workflow-store';
import { NodeSchema } from '@/services/node-schema';
import { NodeEditorProps, SchemaFieldDef } from '../../common/schema-node';
import ServerVideoField from '../../common/server-video-field';

/**
 * What VHS's video loaders share: the input file and the resize/resample
 * settings. Each loader adds its own trim fields.
 */

/** The loader's video file, with its preview. */
export function VHSVideoHeader({
  node,
  serverId,
  workflowId,
  schema,
}: NodeEditorProps & { schema: NodeSchema | null }) {
  const updateNodeInput = useWorkflowStore((state) => state.updateNodeInput);
  if (node.inputs.video === undefined) return null;
  return (
    <ServerVideoField
      node={node}
      serverId={serverId}
      schema={schema}
      inputKey="video"
      title="Video"
      onChange={(filename) => updateNodeInput(workflowId, node.id, 'video', filename)}
    />
  );
}

/** VHS declares 0–60 in whole steps, with 0 keeping the source's rate. */
export const VHS_RATE_FIELD: SchemaFieldDef = {
  inputKey: 'force_rate',
  title: 'Force Frame Rate (fps, 0 = source)',
  fallback: { kind: 'float', min: 0, max: 60, step: 1 },
};

/** VHS declares no step for these; it rounds sizes to multiples of 8 anyway. */
export const VHS_SIZE_FIELDS: SchemaFieldDef[] = [
  {
    inputKey: 'custom_width',
    title: 'Width (px, 0 = source)',
    control: 'stepper',
    step: 8,
    fallback: { kind: 'int', min: 0, max: 8192, step: 8 },
  },
  {
    inputKey: 'custom_height',
    title: 'Height (px, 0 = source)',
    control: 'stepper',
    step: 8,
    fallback: { kind: 'int', min: 0, max: 8192, step: 8 },
  },
];

export const VHS_FRAME_CAP_FIELD: SchemaFieldDef = {
  inputKey: 'frame_load_cap',
  title: 'Frame Load Cap (0 = all)',
  control: 'stepper',
  fallback: { kind: 'int', min: 0, step: 1 },
};

export const VHS_FORMAT_FIELD: SchemaFieldDef = {
  inputKey: 'format',
  title: 'Format',
  fallback: {
    kind: 'combo',
    options: ['None', 'AnimateDiff', 'Mochi', 'LTXV', 'Hunyuan', 'Cosmos', 'Wan', 'H3'],
  },
};
