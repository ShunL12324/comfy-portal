import SchemaNode, { NodeEditorProps, SchemaFieldDef } from '../../common/schema-node';
import { CORE_NUMBER_SPECS } from './core-number-specs';

const FIELDS: SchemaFieldDef[] = [
  { inputKey: 'shift', title: 'Shift', fallback: CORE_NUMBER_SPECS.ModelSamplingSD3.shift },
];

export default function ModelSamplingSD3(props: NodeEditorProps) {
  return <SchemaNode {...props} fields={FIELDS} />;
}
