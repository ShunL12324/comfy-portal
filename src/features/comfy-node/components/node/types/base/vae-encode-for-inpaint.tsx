import SchemaNode, { NodeEditorProps, SchemaFieldDef } from '../../common/schema-node';
import { CORE_NUMBER_SPECS } from './core-number-specs';

const FIELDS: SchemaFieldDef[] = [
  { inputKey: 'grow_mask_by', title: 'grow_mask_by', fallback: CORE_NUMBER_SPECS.VAEEncodeForInpaint.grow_mask_by },
];

export default function VAEEncodeForInpaint(props: NodeEditorProps) {
  return <SchemaNode {...props} fields={FIELDS} />;
}
