import { describeSigmas } from '@/features/comfy-node/utils/sigmas';
import SchemaNode, { NodeEditorProps, SchemaFieldDef } from '../../common/schema-node';

/**
 * A hand-written noise schedule. The node reads every number in the text, so
 * the hint reports how many it found — the only feedback there is before a
 * run fails on too few.
 */
export default function ManualSigmas(props: NodeEditorProps) {
  const text = props.node.inputs.sigmas;
  const summary = typeof text === 'string' ? describeSigmas(text) : null;
  const hint = !summary
    ? undefined
    : summary.valid
      ? `${summary.count} sigmas · ${summary.steps} ${summary.steps === 1 ? 'step' : 'steps'}`
      : 'Needs at least two numbers, highest first.';

  const fields: SchemaFieldDef[] = [
    {
      inputKey: 'sigmas',
      title: 'Sigmas',
      placeholder: '1, 0.5, 0',
      fallback: { kind: 'string', multiline: false },
      hint,
    },
  ];

  return <SchemaNode {...props} fields={fields} />;
}
