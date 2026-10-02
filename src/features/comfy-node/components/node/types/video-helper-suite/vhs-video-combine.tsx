import SchemaNode, { NodeEditorProps, SchemaFieldDef } from '../../common/schema-node';

/**
 * `pix_fmt`, `crf`, `save_metadata` and `trim_to_audio` belong to the chosen
 * format (VHS nests them under each format's definition), so the server
 * schema has no top-level entry for them and their fallbacks are what render.
 * Whichever of them the workflow carries are shown; the rest render nothing.
 */
const FIELDS: SchemaFieldDef[] = [
  { inputKey: 'frame_rate', title: 'Frame Rate', fallback: { kind: 'float', min: 1, max: 120, step: 1 } },
  { inputKey: 'loop_count', title: 'Loop Count', fallback: { kind: 'int', min: 0, max: 100, step: 1 } },
  {
    inputKey: 'filename_prefix',
    title: 'Filename Prefix',
    fallback: { kind: 'string', multiline: false },
  },
  {
    inputKey: 'format',
    title: 'Format',
    fallback: {
      kind: 'combo',
      options: [
        'image/gif',
        'image/webp',
        'video/16bit-png',
        'video/8bit-png',
        'video/ProRes',
        'video/av1-webm',
        'video/ffmpeg-gif',
        'video/ffv1-mkv',
        'video/h264-mp4',
        'video/h265-mp4',
        'video/nvenc_av1-mp4',
        'video/nvenc_h264-mp4',
        'video/nvenc_hevc-mp4',
        'video/webm',
      ],
    },
  },
  { inputKey: 'pix_fmt', title: 'Pixel Format', fallback: { kind: 'combo', options: ['yuv420p', 'yuv420p10le'] } },
  { inputKey: 'crf', title: 'CRF', fallback: { kind: 'int', min: 0, max: 51, step: 1 } },
  { inputKey: 'save_output', title: 'Save Output', fallback: { kind: 'boolean' } },
  { inputKey: 'pingpong', title: 'Ping Pong', fallback: { kind: 'boolean' } },
  { inputKey: 'save_metadata', title: 'Save Metadata', fallback: { kind: 'boolean' } },
  { inputKey: 'trim_to_audio', title: 'Trim to Audio', fallback: { kind: 'boolean' } },
];

export default function VHS_VideoCombine(props: NodeEditorProps) {
  return <SchemaNode {...props} fields={FIELDS} />;
}
