import SchemaNode, { NodeEditorProps, SchemaFieldDef } from '../../common/schema-node';

const UNIT: SchemaFieldDef['fallback'] = { kind: 'float', min: 0, max: 1, step: 0.01 };
const PIXELS: SchemaFieldDef['fallback'] = { kind: 'int', min: 0, max: 256, step: 1 };
const FRAMES: SchemaFieldDef['fallback'] = { kind: 'int', min: 0, max: 64, step: 1 };
const EXPAND: SchemaFieldDef['fallback'] = { kind: 'int', min: -512, max: 512, step: 1 };

/** Ordered as the node applies them: threshold, clean up, grow, snap, soften. */
const FIELDS: SchemaFieldDef[] = [
  { inputKey: 'invert', title: 'Invert', fallback: { kind: 'boolean' } },
  { inputKey: 'black_point', title: 'Black Point', fallback: UNIT },
  { inputKey: 'white_point', title: 'White Point', fallback: UNIT },
  { inputKey: 'despeckle', title: 'Remove Specks (px)', fallback: PIXELS },
  { inputKey: 'fill_holes', title: 'Fill Holes', fallback: { kind: 'boolean' } },
  { inputKey: 'close_gaps', title: 'Close Gaps (px)', fallback: PIXELS },
  { inputKey: 'temporal_expand', title: 'Expand in Time (frames)', fallback: FRAMES },
  { inputKey: 'temporal_smooth', title: 'Smooth in Time (frames)', fallback: FRAMES },
  { inputKey: 'expand', title: 'Expand / Contract (px)', fallback: EXPAND },
  { inputKey: 'blockify', title: 'Blockify (px)', fallback: PIXELS, hint: 'A connected VAE sets the grid itself.' },
  { inputKey: 'blockify_threshold', title: 'Block Coverage', fallback: UNIT },
  { inputKey: 'feather', title: 'Feather (px)', fallback: PIXELS },
  { inputKey: 'edge_low', title: 'Edge Low', fallback: UNIT },
  { inputKey: 'edge_high', title: 'Edge High', fallback: UNIT },
];

/** The lean variant's three controls, shared so both read alike. */
export const LEAN_FIELDS: SchemaFieldDef[] = FIELDS.filter((field) =>
  ['fill_holes', 'expand', 'feather'].includes(field.inputKey),
);

export default function NKDMaskOps(props: NodeEditorProps) {
  return <SchemaNode {...props} fields={FIELDS} />;
}
