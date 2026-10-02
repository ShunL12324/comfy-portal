import SchemaNode, { NodeEditorProps, SchemaFieldDef } from '../../common/schema-node';
import { GPU_MODES } from './minimax-h3-adaptive-loader';

const FIELDS: SchemaFieldDef[] = [
  { inputKey: 'gpu_mode', title: 'GPU Mode', fallback: { kind: 'combo', options: GPU_MODES } },
];

export default function MiniMaxVideoEncodeCached(props: NodeEditorProps) {
  return <SchemaNode {...props} fields={FIELDS} />;
}
