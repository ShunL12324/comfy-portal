import SchemaNode, { NodeEditorProps, SchemaFieldDef } from '../../common/schema-node';

const isEnabled = (inputs: NodeEditorProps['node']['inputs']) => inputs.enabled !== false;

/** The shifts only apply while the patch is on, so they step aside when it's off. */
const FIELDS: SchemaFieldDef[] = [
  { inputKey: 'enabled', title: 'Enabled', fallback: { kind: 'boolean' } },
  {
    inputKey: 'shift_video',
    title: 'Video Shift',
    control: 'stepper',
    fallback: { kind: 'float', min: 0.01, max: 100, step: 0.01 },
    visible: isEnabled,
  },
  {
    inputKey: 'shift_audio',
    title: 'Audio Shift',
    control: 'stepper',
    fallback: { kind: 'float', min: 0.01, max: 100, step: 0.01 },
    visible: isEnabled,
  },
];

export default function MiniMaxH3OptionalShift(props: NodeEditorProps) {
  return <SchemaNode {...props} fields={FIELDS} />;
}
