import SchemaNode, { NodeEditorProps, SchemaFieldDef } from '../../common/schema-node';

const FIELDS: SchemaFieldDef[] = [
  { inputKey: 'stride', title: 'Stride', fallback: { kind: 'int', min: 1, max: 16, step: 1 } },
  {
    inputKey: 'detection_every_frames',
    title: 'Detect Every N Frames',
    fallback: { kind: 'int', min: 1, max: 120, step: 1 },
  },
  { inputKey: 'flow_width', title: 'Flow Width', fallback: { kind: 'int', min: 128, max: 1024, step: 32 } },
  { inputKey: 'motion_compensation', title: 'Motion Compensation', fallback: { kind: 'boolean' } },
];

export default function SAM3TemporalMask(props: NodeEditorProps) {
  return <SchemaNode {...props} fields={FIELDS} />;
}
