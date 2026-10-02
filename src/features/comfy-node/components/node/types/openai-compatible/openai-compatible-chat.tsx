import SchemaNode, { NodeEditorProps, SchemaFieldDef } from '../../common/schema-node';
import SeedControl from '../../common/seed-control';

/**
 * The generation, input and media settings, which the desktop UI keeps
 * behind its own toggle. Marked here so they collapse even before the
 * server's definition (and its `advanced` flags) arrives.
 */
const ADVANCED_FIELDS: SchemaFieldDef[] = (
  [
    {
      inputKey: 'temperature',
      title: 'Temperature (-1 = omit)',
      fallback: { kind: 'float', min: -1, max: 2, step: 0.01 },
    },
    {
      inputKey: 'max_tokens',
      title: 'Max Tokens (0 = provider)',
      control: 'stepper',
      fallback: { kind: 'int', min: 0, max: 1000000, step: 1 },
    },
    {
      inputKey: 'reasoning_effort',
      title: 'Reasoning Effort',
      fallback: { kind: 'combo', options: ['default', 'none', 'low', 'medium', 'high', 'max'] },
    },
    {
      inputKey: 'input_mode',
      title: 'Input Mode',
      fallback: { kind: 'combo', options: ['join', 'separate_messages'] },
      labels: { join: 'Join into one message', separate_messages: 'Separate messages' },
    },
    {
      inputKey: 'separator',
      title: 'Separator',
      fallback: { kind: 'string', multiline: false },
      visible: (inputs) => inputs.input_mode !== 'separate_messages',
    },
    {
      inputKey: 'timeout',
      title: 'Timeout (s)',
      control: 'stepper',
      fallback: { kind: 'int', min: 5, max: 3600, step: 1 },
    },
    {
      inputKey: 'image_detail',
      title: 'Image Detail',
      fallback: { kind: 'combo', options: ['auto', 'low', 'high'] },
    },
    {
      inputKey: 'image_format',
      title: 'Image Format',
      fallback: { kind: 'combo', options: ['jpeg', 'png', 'webp'] },
    },
    {
      inputKey: 'image_max_side',
      title: 'Image Max Side (px, 0 = full size)',
      control: 'stepper',
      step: 64,
      fallback: { kind: 'int', min: 0, max: 8192, step: 64 },
    },
    {
      inputKey: 'video_max_mb',
      title: 'Video Max (MB)',
      control: 'stepper',
      fallback: { kind: 'int', min: 1, max: 500, step: 1 },
    },
  ] satisfies SchemaFieldDef[]
).map((field) => ({ ...field, advanced: true }));

const FIELDS: SchemaFieldDef[] = [
  {
    inputKey: 'base_url',
    title: 'Base URL',
    placeholder: 'https://api.openai.com/v1',
    fallback: { kind: 'string', multiline: false },
  },
  {
    inputKey: 'api_key',
    title: 'API Key',
    placeholder: 'sk-... or env:VARIABLE',
    secure: true,
    fallback: { kind: 'string', multiline: false },
    hint: "Saved inside the workflow. Leave empty to use the server's environment.",
  },
  {
    inputKey: 'model',
    title: 'Model',
    placeholder: 'Model id',
    fallback: { kind: 'string', multiline: false },
  },
  {
    inputKey: 'system_prompt',
    title: 'System Prompt',
    expandable: true,
    placeholder: 'Optional instructions',
    fallback: { kind: 'string', multiline: true },
  },
  { inputKey: 'reuse_last_result', title: 'Reuse Last Answer', fallback: { kind: 'boolean' } },
  ...ADVANCED_FIELDS,
];

/**
 * An OpenAI-compatible chat call. The prompt parts and images are wired in;
 * the connection, model and generation settings are here.
 *
 * `model` is a combo on the server, but its options are filled client-side by
 * the desktop UI's "Refresh models" button, so the server's own list is only
 * a placeholder — the model id is typed instead.
 */
export default function OpenAICompatibleChat(props: NodeEditorProps) {
  const { node, workflowId } = props;
  return (
    <SchemaNode
      {...props}
      fields={FIELDS}
      footer={() =>
        node.inputs.seed !== undefined ? (
          <SeedControl node={node} workflowId={workflowId} inputKey="seed" title="Seed" defaultRandom={false} />
        ) : null
      }
    />
  );
}
