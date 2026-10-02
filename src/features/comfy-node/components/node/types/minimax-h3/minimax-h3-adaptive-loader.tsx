import SchemaNode, { NodeEditorProps, SchemaFieldDef } from '../../common/schema-node';

export const GPU_MODES = ['auto', 'single', 'dual', 'quad', 'octa'];

const FIELDS: SchemaFieldDef[] = [
  {
    inputKey: 'unet_name',
    title: 'Model',
    modelFolders: 'diffusion_models',
    fallback: { kind: 'combo', options: [] },
  },
  {
    inputKey: 'weight_dtype',
    title: 'Weight Type',
    fallback: { kind: 'combo', options: ['default', 'fp8_e4m3fn', 'fp8_e4m3fn_fast', 'fp8_e5m2'] },
  },
  { inputKey: 'gpu_mode', title: 'GPU Mode', fallback: { kind: 'combo', options: GPU_MODES } },
];

export default function MiniMaxH3AdaptiveLoader(props: NodeEditorProps) {
  return <SchemaNode {...props} fields={FIELDS} />;
}
