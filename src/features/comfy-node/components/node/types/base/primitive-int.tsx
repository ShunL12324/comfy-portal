import SchemaNode, { NodeEditorProps, SchemaFieldDef } from '../../common/schema-node';

/**
 * ComfyUI's INT range is ±2^63, past what a JS number holds exactly, so the
 * stepper stops at the safe-integer bounds instead.
 */
const FIELDS: SchemaFieldDef[] = [
  {
    inputKey: 'value',
    title: 'Value',
    control: 'stepper',
    fallback: { kind: 'int', min: Number.MIN_SAFE_INTEGER, max: Number.MAX_SAFE_INTEGER, step: 1 },
  },
];

export default function PrimitiveInt(props: NodeEditorProps) {
  return <SchemaNode {...props} fields={FIELDS} />;
}
