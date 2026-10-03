import SchemaNode, { NodeEditorProps, SchemaFieldDef } from '../../common/schema-node';
import { RESIZE_METHODS } from './mvex-subject-crop-parallel';

const FIELDS: SchemaFieldDef[] = [
  {
    inputKey: 'feather',
    title: 'Feather (px)',
    fallback: { kind: 'int', min: 0, step: 1 },
  },
  { inputKey: 'resize_method', title: 'Resize Method', fallback: { kind: 'combo', options: RESIZE_METHODS } },
];

export default function MVExSubjectUncrop(props: NodeEditorProps) {
  return <SchemaNode {...props} fields={FIELDS} />;
}
