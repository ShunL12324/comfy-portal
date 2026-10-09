import SchemaNode, { NodeEditorProps, SchemaFieldDef } from '../../common/schema-node';
import { CORE_NUMBER_SPECS } from '../base/core-number-specs';

const SPECS = CORE_NUMBER_SPECS.MiniMaxH3SigmaShift;

/** ModelSamplingMiniMaxH3: the flow shifts a turbo LoRA was distilled at. */
const FIELDS: SchemaFieldDef[] = [
  { inputKey: 'shift_video', title: 'Video Shift', fallback: SPECS.shift_video },
  { inputKey: 'shift_audio', title: 'Audio Shift', fallback: SPECS.shift_audio },
];

export default function MiniMaxH3SigmaShift(props: NodeEditorProps) {
  return <SchemaNode {...props} fields={FIELDS} />;
}
