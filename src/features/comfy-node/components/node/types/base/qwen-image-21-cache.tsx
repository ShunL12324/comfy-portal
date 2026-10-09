import SchemaNode, { NodeEditorProps, SchemaFieldDef } from '../../common/schema-node';

const FIELDS: SchemaFieldDef[] = [
  {
    inputKey: 'device',
    title: 'Cache Device',
    fallback: { kind: 'combo', options: ['auto', 'gpu', 'cpu', 'off'] },
    labels: { auto: 'Auto (spare VRAM, then RAM)', gpu: 'GPU', cpu: 'CPU (RAM)', off: 'Off (recompute)' },
  },
  {
    inputKey: 'dtype',
    title: 'Cache Precision',
    fallback: { kind: 'combo', options: ['default', 'int8', 'int4'] },
    labels: { default: 'Default (lossless)', int8: 'INT8 (half size)', int4: 'INT4 (quarter size)' },
  },
];

/** The KV cache Qwen Image 2.1 keeps of the prompt and references across steps. */
export default function QwenImage21Cache(props: NodeEditorProps) {
  return <SchemaNode {...props} fields={FIELDS} />;
}
