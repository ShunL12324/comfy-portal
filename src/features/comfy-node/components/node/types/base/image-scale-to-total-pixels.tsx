import SchemaNode, { NodeEditorProps, SchemaFieldDef } from '../../common/schema-node';

const FIELDS: SchemaFieldDef[] = [
  {
    inputKey: 'upscale_method',
    title: 'Upscale Method',
    fallback: { kind: 'combo', options: ['nearest-exact', 'bilinear', 'area', 'bicubic', 'lanczos'] },
  },
  { inputKey: 'megapixels', title: 'Megapixels', fallback: { kind: 'float', min: 0.01, max: 16, step: 0.01 } },
  {
    inputKey: 'resolution_steps',
    title: 'Round to Multiple of',
    control: 'stepper',
    fallback: { kind: 'int', min: 1, max: 256, step: 1 },
  },
];

export default function ImageScaleToTotalPixels(props: NodeEditorProps) {
  return <SchemaNode {...props} fields={FIELDS} />;
}
