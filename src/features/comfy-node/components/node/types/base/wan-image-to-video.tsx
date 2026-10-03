import SchemaNode, { NodeEditorProps, SchemaFieldDef } from '../../common/schema-node';
import { CORE_NUMBER_SPECS } from './core-number-specs';

const SPECS = CORE_NUMBER_SPECS.WanImageToVideo;

const FIELDS: SchemaFieldDef[] = [
  { inputKey: 'width', title: 'Width', fallback: SPECS.width },
  { inputKey: 'height', title: 'Height', fallback: SPECS.height },
  { inputKey: 'length', title: 'Length', fallback: SPECS.length },
  { inputKey: 'batch_size', title: 'Batch Size', fallback: SPECS.batch_size },
];

export default function WanImageToVideo(props: NodeEditorProps) {
  return <SchemaNode {...props} fields={FIELDS} />;
}
