import SchemaNode, { NodeEditorProps } from '../../common/schema-node';
import { LEAN_FIELDS } from './nkd-mask-ops';

export default function NKDMaskOpsLean(props: NodeEditorProps) {
  return <SchemaNode {...props} fields={LEAN_FIELDS} />;
}
