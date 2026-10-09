import SchemaNode, { NodeEditorProps, SchemaFieldDef } from '../../common/schema-node';
import { CORE_NUMBER_SPECS } from '../base/core-number-specs';

const SPECS = CORE_NUMBER_SPECS.MiniMaxH3ImageToVideo;

/**
 * Text to video, or first/last frame to video when `first_frame` /
 * `last_frame` are wired. The frames are sockets; everything tuned per run is
 * here, and width/height fed by other nodes say so.
 */
const FIELDS: SchemaFieldDef[] = [
  {
    inputKey: 'prompt',
    title: 'Prompt',
    expandable: true,
    placeholder: 'Describe the shots, motion and sound...',
    fallback: { kind: 'string', multiline: true },
  },
  {
    inputKey: 'width',
    title: 'Width (px)',
    fallback: SPECS.width,
    pairedWith: { inputKey: 'height', title: 'Height (px)', rowTitle: 'Width × Height (px)', swappable: true },
  },
  {
    inputKey: 'length',
    title: 'Length (frames)',
    fallback: SPECS.length,
    hint: '24 fps: 124 frames is about 5 s.',
  },
];

export default function MiniMaxH3ImageToVideo(props: NodeEditorProps) {
  return <SchemaNode {...props} fields={FIELDS} />;
}
