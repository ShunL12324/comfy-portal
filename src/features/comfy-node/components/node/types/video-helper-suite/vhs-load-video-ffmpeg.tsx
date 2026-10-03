import SchemaNode, { NodeEditorProps, SchemaFieldDef } from '../../common/schema-node';
import {
  VHS_FORMAT_FIELD,
  VHS_FRAME_CAP_FIELD,
  VHS_RATE_FIELD,
  VHS_SIZE_FIELDS,
  VHSVideoHeader,
} from './vhs-load-video-fields';

/** VHS_LoadVideoFFmpeg (Load Video FFmpeg (Upload)): seeks by time, caps by frame count. */
const FIELDS: SchemaFieldDef[] = [
  VHS_RATE_FIELD,
  ...VHS_SIZE_FIELDS,
  VHS_FRAME_CAP_FIELD,
  {
    inputKey: 'start_time',
    title: 'Start (s)',
    fallback: { kind: 'float', min: 0, step: 0.001 },
  },
  VHS_FORMAT_FIELD,
];

export default function VHSLoadVideoFFmpeg(props: NodeEditorProps) {
  return <SchemaNode {...props} fields={FIELDS} header={(schema) => <VHSVideoHeader {...props} schema={schema} />} />;
}
