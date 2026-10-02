import { useWorkflowStore } from '@/features/workflow/stores/workflow-store';
import SchemaNode, { NodeEditorProps, SchemaFieldDef } from '../../common/schema-node';
import ServerVideoField from '../../common/server-video-field';

/**
 * VHS keeps timestamps to the millisecond (step 0.001), which makes stepper
 * buttons useless; they move by a tenth instead, and typing allows any value.
 */
const TIMESTAMP_STEP = 0.1;

/** VHS treats 0 as "leave as is" for these; the titles say so rather than a hint per row. */
const FIELDS: SchemaFieldDef[] = [
  {
    inputKey: 'start_time',
    title: 'Start (s)',
    control: 'stepper',
    step: TIMESTAMP_STEP,
    fallback: { kind: 'float', min: 0, step: 0.001 },
  },
  {
    inputKey: 'duration',
    title: 'Duration (s, 0 = to end)',
    control: 'stepper',
    step: TIMESTAMP_STEP,
    fallback: { kind: 'float', min: 0, step: 0.001 },
  },
  {
    inputKey: 'force_rate',
    title: 'Force Frame Rate (0 = source)',
    fallback: { kind: 'float', min: 0, max: 60, step: 1 },
  },
  {
    inputKey: 'custom_width',
    title: 'Width (0 = source)',
    control: 'stepper',
    fallback: { kind: 'int', min: 0, max: 8192, step: 8 },
  },
  {
    inputKey: 'custom_height',
    title: 'Height (0 = source)',
    control: 'stepper',
    fallback: { kind: 'int', min: 0, max: 8192, step: 8 },
  },
  {
    inputKey: 'select_every_nth',
    title: 'Select Every Nth Frame',
    control: 'stepper',
    fallback: { kind: 'int', min: 1, step: 1 },
  },
  {
    inputKey: 'format',
    title: 'Format',
    fallback: {
      kind: 'combo',
      options: ['None', 'AnimateDiff', 'Mochi', 'LTXV', 'Hunyuan', 'Cosmos', 'Wan', 'H3'],
    },
  },
];

export default function VHSLoadVideoTrimSeek(props: NodeEditorProps) {
  const updateNodeInput = useWorkflowStore((state) => state.updateNodeInput);
  const { node, serverId, workflowId } = props;

  return (
    <SchemaNode
      {...props}
      fields={FIELDS}
      header={(schema) =>
        typeof node.inputs.video === 'string' ? (
          <ServerVideoField
            node={node}
            serverId={serverId}
            schema={schema}
            inputKey="video"
            title="Video"
            onChange={(filename) => updateNodeInput(workflowId, node.id, 'video', filename)}
          />
        ) : null
      }
    />
  );
}
