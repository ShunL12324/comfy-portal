import SchemaNode, { NodeEditorProps, SchemaFieldDef } from '../../common/schema-node';

/** The megapixel target is ignored while the crop keeps its native size. */
const FIELDS: SchemaFieldDef[] = [
  { inputKey: 'use_original_resolution', title: 'Use Original Resolution', fallback: { kind: 'boolean' } },
  {
    inputKey: 'megapixels',
    title: 'Megapixels',
    fallback: { kind: 'float', min: 0.05, max: 4, step: 0.05 },
    hint: 'Smaller is much faster: 0.3 MP is about 670 × 450.',
    visible: (inputs) => inputs.use_original_resolution !== true,
  },
];

export default function MiniMaxCropTarget(props: NodeEditorProps) {
  return <SchemaNode {...props} fields={FIELDS} />;
}
