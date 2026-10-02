import SchemaNode, { NodeEditorProps, SchemaFieldDef } from '../../common/schema-node';
import {
  VHS_FORMAT_FIELD,
  VHS_FRAME_CAP_FIELD,
  VHS_RATE_FIELD,
  VHS_SIZE_FIELDS,
  VHSVideoHeader,
} from './vhs-load-video-fields';

/** VHS_LoadVideo (Load Video (Upload)): trims by frame count rather than by time. */
const FIELDS: SchemaFieldDef[] = [
  VHS_RATE_FIELD,
  ...VHS_SIZE_FIELDS,
  VHS_FRAME_CAP_FIELD,
  {
    inputKey: 'skip_first_frames',
    title: 'Skip First Frames',
    control: 'stepper',
    fallback: { kind: 'int', min: 0, step: 1 },
  },
  {
    inputKey: 'select_every_nth',
    title: 'Select Every Nth Frame',
    control: 'stepper',
    fallback: { kind: 'int', min: 1, step: 1 },
  },
  VHS_FORMAT_FIELD,
];

export default function VHSLoadVideo(props: NodeEditorProps) {
  return <SchemaNode {...props} fields={FIELDS} header={(schema) => <VHSVideoHeader {...props} schema={schema} />} />;
}
