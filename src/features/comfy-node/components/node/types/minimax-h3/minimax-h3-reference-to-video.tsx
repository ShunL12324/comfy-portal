import SchemaNode, { NodeEditorProps, SchemaFieldDef } from '../../common/schema-node';

/**
 * The reference media (`ref_images.*`, `ref_videos.*`, ...) are wired
 * sockets; everything a user tunes per run is here. Width, height and length
 * are usually fed by other nodes, in which case they say so.
 */
const FIELDS: SchemaFieldDef[] = [
  {
    inputKey: 'prompt',
    title: 'Prompt',
    expandable: true,
    placeholder: 'Describe the video...',
    fallback: { kind: 'string', multiline: true },
  },
  {
    inputKey: 'width',
    title: 'Width (px)',
    fallback: { kind: 'int', min: 32, max: 16384, step: 32 },
    pairedWith: { inputKey: 'height', title: 'Height (px)', rowTitle: 'Width × Height (px)', swappable: true },
  },
  {
    inputKey: 'length',
    title: 'Length (frames)',
    control: 'stepper',
    fallback: { kind: 'int', min: 5, max: 3600, step: 17 },
    hint: '24 fps: 124 frames is about 5 s.',
  },
  {
    inputKey: 'ref_image_size',
    title: 'Reference Image Size',
    fallback: { kind: 'combo', options: ['match', 'max'] },
    labels: { match: 'Match generation size', max: 'Max (2048 short edge, slower)' },
  },
];

export default function MiniMaxH3ReferenceToVideo(props: NodeEditorProps) {
  return <SchemaNode {...props} fields={FIELDS} />;
}
