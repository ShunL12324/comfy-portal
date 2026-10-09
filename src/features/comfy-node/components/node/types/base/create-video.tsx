import SchemaNode, { NodeEditorProps, SchemaFieldDef } from '../../common/schema-node';
import { CORE_NUMBER_SPECS } from './core-number-specs';

const FIELDS: SchemaFieldDef[] = [
  { inputKey: 'fps', title: 'Frame Rate (fps)', fallback: CORE_NUMBER_SPECS.CreateVideo.fps },
  {
    inputKey: 'color_space',
    title: 'Color Space',
    advanced: true,
    fallback: { kind: 'combo', options: ['sRGB', 'HDR', 'HDR PQ'] },
  },
];

/** Frames (and optional audio) into a video; the images and audio are sockets. */
export default function CreateVideo(props: NodeEditorProps) {
  return <SchemaNode {...props} fields={FIELDS} />;
}
