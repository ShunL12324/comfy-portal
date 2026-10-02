import SchemaNode, { NodeEditorProps, SchemaFieldDef } from '../../common/schema-node';

/**
 * The type list grows with every model family ComfyUI adds, so the server's
 * list is used whenever it can be read; this one only covers the offline case.
 */
const FIELDS: SchemaFieldDef[] = [
  {
    inputKey: 'clip_name',
    title: 'Text Encoder',
    modelFolders: 'text_encoders',
    fallback: { kind: 'combo', options: [] },
  },
  {
    inputKey: 'type',
    title: 'Type',
    fallback: {
      kind: 'combo',
      options: [
        'stable_diffusion',
        'stable_cascade',
        'sd3',
        'stable_audio',
        'mochi',
        'ltxv',
        'pixart',
        'cosmos',
        'lumina2',
        'wan',
        'hidream',
        'chroma',
        'ace',
        'omnigen2',
        'qwen_image',
        'hunyuan_image',
        'flux2',
        'minimax',
      ],
    },
  },
  { inputKey: 'device', title: 'Device', fallback: { kind: 'combo', options: ['default', 'cpu'] } },
];

export default function CLIPLoader(props: NodeEditorProps) {
  return <SchemaNode {...props} fields={FIELDS} />;
}
