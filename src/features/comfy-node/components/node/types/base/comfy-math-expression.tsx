import SchemaNode, { NodeEditorProps, SchemaFieldDef } from '../../common/schema-node';

/** The operands (`values.a`, `values.b`, ...) are always wired, so only the expression is editable. */
const FIELDS: SchemaFieldDef[] = [
  {
    inputKey: 'expression',
    title: 'Expression',
    placeholder: 'a + b',
    fallback: { kind: 'string', multiline: true },
    hint: 'Operands a, b, c… are the connected inputs, in order.',
  },
];

export default function ComfyMathExpression(props: NodeEditorProps) {
  return <SchemaNode {...props} fields={FIELDS} />;
}
