import SchemaNode, { NodeEditorProps, SchemaFieldDef } from '../../common/schema-node';

const followsMask = (inputs: NodeEditorProps['node']['inputs']) => inputs.audio_mode === 'follow mask';

/** The ramps only shape the seams of a masked regeneration, so they appear with "follow mask". */
const FIELDS: SchemaFieldDef[] = [
  {
    inputKey: 'audio_mode',
    title: 'Audio',
    fallback: { kind: 'combo', options: ['keep', 'regenerate', 'follow mask'] },
    labels: { keep: 'Keep', regenerate: 'Regenerate', 'follow mask': 'Follow mask' },
  },
  {
    inputKey: 'fps',
    title: 'Frame Rate (fps)',
    fallback: { kind: 'float', min: 1, max: 240, step: 0.01 },
  },
  {
    inputKey: 'ramp_ticks',
    title: 'Ramp In (1/40 s)',
    fallback: { kind: 'int', min: 0, max: 40, step: 1 },
    visible: followsMask,
  },
  {
    inputKey: 'ramp_out_ticks',
    title: 'Ramp Out (1/40 s)',
    fallback: { kind: 'int', min: 0, max: 40, step: 1 },
    visible: followsMask,
  },
  {
    inputKey: 'ramp_shape',
    title: 'Ramp Shape',
    fallback: { kind: 'combo', options: ['cosine', 'linear', 'high band', 'exponential in', 'exponential out'] },
    visible: followsMask,
  },
];

export default function NKDAVLatentPreencoded(props: NodeEditorProps) {
  return <SchemaNode {...props} fields={FIELDS} />;
}
