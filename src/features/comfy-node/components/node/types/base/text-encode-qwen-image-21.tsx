import SchemaNode, { NodeEditorProps, SchemaFieldDef } from '../../common/schema-node';
import { CORE_NUMBER_SPECS } from './core-number-specs';

/** Reference images arrive as `images.image_1`, `images.image_2`, ... sockets. */
const hasReferences = (inputs: Record<string, unknown>) => Object.keys(inputs).some((key) => key.startsWith('images.'));

const FIELDS: SchemaFieldDef[] = [
  {
    inputKey: 'prompt',
    title: 'Prompt',
    expandable: true,
    placeholder: 'Describe the image, or the edit...',
    fallback: { kind: 'string', multiline: true },
  },
  {
    inputKey: 'resolution',
    title: 'Reference Size (px)',
    fallback: CORE_NUMBER_SPECS.TextEncodeQwenImage21.resolution,
    hint: 'Edge of the square pixel budget; 0 keeps each reference at its own size.',
    visible: hasReferences,
  },
  // Ignored at CFG 1, the model's default.
  {
    inputKey: 'negative_prompt',
    title: 'Negative Prompt',
    expandable: true,
    advanced: true,
    fallback: { kind: 'string', multiline: true },
  },
];

export default function TextEncodeQwenImage21(props: NodeEditorProps) {
  return <SchemaNode {...props} fields={FIELDS} />;
}
