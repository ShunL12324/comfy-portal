import SchemaNode, { NodeEditorProps, SchemaFieldDef } from '../../common/schema-node';

const FIELDS: SchemaFieldDef[] = [
  {
    inputKey: 'frame_count',
    title: 'Frame Count',
    fallback: { kind: 'int', min: 0, step: 1 },
  },
];

export default function MiniMaxTrimFrames(props: NodeEditorProps) {
  return <SchemaNode {...props} fields={FIELDS} />;
}
