import { optionWidgetUpdates } from '@/features/comfy-node/utils/schema-inputs';
import { useWorkflowStore } from '@/features/workflow/stores/workflow-store';
import { useNodeSchema } from '@/hooks/use-node-schema';
import { useCallback } from 'react';
import SchemaNode, { NodeEditorProps, SchemaFieldDef } from '../../common/schema-node';
import { VHS_FORMATS, VHS_FORMAT_WIDGETS, formatWidgetTitle } from './vhs-video-formats';

/** The node's own inputs, which a format switch never touches. */
const OWN_INPUTS = ['images', 'audio', 'meta_batch', 'vae', 'frame_rate', 'loop_count', 'filename_prefix', 'format'];

/** Ranges too long for a thumb to place one value. */
const STEPPERS = new Set(['bitrate', 'gop_size']);

/**
 * Each format brings its own settings (`crf`, `pix_fmt`, `bitrate`, ...),
 * stored as plain inputs beside the node's own. They come from the server's
 * definition of `format`, or VHS's format files while it loads, and follow
 * the selected format: switching swaps them as the desktop UI does, keeping
 * any shared value the new format accepts.
 */
export default function VHS_VideoCombine(props: NodeEditorProps) {
  const { node, serverId, workflowId } = props;
  const updateNodeInput = useWorkflowStore((state) => state.updateNodeInput);
  const schema = useNodeSchema(serverId, node.class_type);
  const formatSpec = schema?.inputs.format;
  const widgets = (formatSpec?.kind === 'combo' && formatSpec.widgets) || VHS_FORMAT_WIDGETS;
  const format = typeof node.inputs.format === 'string' ? node.inputs.format : '';

  const handleFormatChange = useCallback(
    (next: unknown) => {
      if (typeof next !== 'string') return;
      const own = new Set([...OWN_INPUTS, ...Object.keys(schema?.inputs ?? {})]);
      const updates = optionWidgetUpdates(node.inputs, 'format', next, widgets, own);
      for (const [key, value] of Object.entries(updates)) updateNodeInput(workflowId, node.id, key, value);
    },
    [schema, node.inputs, widgets, updateNodeInput, workflowId, node.id],
  );

  const formatFields: SchemaFieldDef[] = Object.entries(widgets[format] ?? {}).flatMap(([key, spec]) =>
    spec.kind === 'link'
      ? []
      : [
          {
            inputKey: key,
            title: formatWidgetTitle(key, node.inputs),
            fallback: spec,
            control: STEPPERS.has(key) ? 'stepper' : undefined,
          },
        ],
  );

  const fields: SchemaFieldDef[] = [
    {
      inputKey: 'frame_rate',
      title: 'Frame Rate (fps)',
      control: 'stepper',
      fallback: { kind: 'float', min: 1, max: 120, step: 1 },
    },
    {
      inputKey: 'loop_count',
      title: 'Loop Count (0 = infinite)',
      fallback: { kind: 'int', min: 0, max: 100, step: 1 },
    },
    { inputKey: 'filename_prefix', title: 'Filename Prefix', fallback: { kind: 'string', multiline: false } },
    {
      inputKey: 'format',
      title: 'Format',
      fallback: { kind: 'combo', options: VHS_FORMATS },
      onChange: handleFormatChange,
    },
    ...formatFields,
    { inputKey: 'save_output', title: 'Save Output', fallback: { kind: 'boolean' } },
    { inputKey: 'pingpong', title: 'Ping Pong', fallback: { kind: 'boolean' } },
  ];

  return <SchemaNode {...props} fields={fields} />;
}
