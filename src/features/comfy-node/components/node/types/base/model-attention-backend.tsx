import SchemaNode, { NodeEditorProps, SchemaFieldDef } from '../../common/schema-node';

const FIELDS: SchemaFieldDef[] = [
  {
    inputKey: 'attention',
    title: 'Backend',
    fallback: { kind: 'combo', options: ['pytorch attention', 'comfy kitchen attention'] },
    hint: 'Comfy Kitchen uses INT8 attention and needs an Nvidia or AMD GPU.',
  },
];

export default function ModelAttentionBackend(props: NodeEditorProps) {
  return <SchemaNode {...props} fields={FIELDS} />;
}
