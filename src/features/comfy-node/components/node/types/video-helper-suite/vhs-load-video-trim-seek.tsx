import SchemaNode, { NodeEditorProps, SchemaFieldDef } from '../../common/schema-node';
import { VHS_FORMAT_FIELD, VHS_RATE_FIELD, VHS_SIZE_FIELDS, VHSVideoHeader } from './vhs-load-video-fields';

/**
 * VHS keeps timestamps to the millisecond (step 0.001), which makes stepper
 * buttons useless; they move by a tenth instead, and typing allows any value.
 */
const TIMESTAMP_STEP = 0.1;

/** VHS treats 0 as "leave as is" for these; the titles say so rather than a hint per row. */
const FIELDS: SchemaFieldDef[] = [
  {
    inputKey: 'start_time',
    title: 'Start (s)',
    control: 'stepper',
    step: TIMESTAMP_STEP,
    fallback: { kind: 'float', min: 0, step: 0.001 },
  },
  {
    inputKey: 'duration',
    title: 'Duration (s, 0 = to end)',
    control: 'stepper',
    step: TIMESTAMP_STEP,
    fallback: { kind: 'float', min: 0, step: 0.001 },
  },
  VHS_RATE_FIELD,
  ...VHS_SIZE_FIELDS,
  {
    inputKey: 'select_every_nth',
    title: 'Select Every Nth Frame',
    control: 'stepper',
    fallback: { kind: 'int', min: 1, step: 1 },
  },
  VHS_FORMAT_FIELD,
];

export default function VHSLoadVideoTrimSeek(props: NodeEditorProps) {
  return <SchemaNode {...props} fields={FIELDS} header={(schema) => <VHSVideoHeader {...props} schema={schema} />} />;
}
