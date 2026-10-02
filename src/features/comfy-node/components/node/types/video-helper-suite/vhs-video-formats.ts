import { WidgetSpec } from '@/services/node-schema';

const bool = (fallback: boolean): WidgetSpec => ({ kind: 'boolean', default: fallback });
const combo = (options: string[], fallback = options[0]): WidgetSpec => ({ kind: 'combo', options, default: fallback });
const int = (min: number, max: number, fallback: number): WidgetSpec => ({
  kind: 'int',
  min,
  max,
  step: 1,
  default: fallback,
});

const NVENC: Record<string, WidgetSpec> = {
  pix_fmt: combo(['yuv420p', 'p010le']),
  bitrate: int(1, 999, 10),
  megabit: bool(true),
  save_metadata: bool(true),
};

/**
 * Video Combine's per-format settings, as VideoHelperSuite declares them in
 * `video_formats/*.json` (plus WebP's `lossless`, added in the node itself),
 * in the order the desktop UI shows them. The server sends the same map under
 * `format`'s `formats` option, and its copy wins once loaded; this one keeps
 * a format switch right while it loads or when the server is offline.
 */
export const VHS_FORMAT_WIDGETS: Record<string, Record<string, WidgetSpec>> = {
  'image/gif': {},
  'image/webp': { lossless: bool(true) },
  'video/16bit-png': {},
  'video/8bit-png': {},
  'video/ProRes': { profile: combo(['lt', 'standard', 'hq', '4444', '4444xq'], 'hq') },
  'video/av1-webm': {
    pix_fmt: combo(['yuv420p10le', 'yuv420p']),
    crf: int(0, 100, 23),
    input_color_depth: combo(['8bit', '16bit']),
    save_metadata: bool(true),
  },
  'video/ffmpeg-gif': {
    dither: combo(
      ['bayer', 'heckbert', 'floyd_steinberg', 'sierra2', 'sierra2_4a', 'sierra3', 'burkes', 'atkinson', 'none'],
      'sierra2_4a',
    ),
  },
  'video/ffv1-mkv': {
    level: combo(['0', '1', '3'], '3'),
    coder: combo(['0', '1', '2'], '1'),
    context: combo(['0', '1'], '1'),
    gop_size: int(1, 300, 1),
    slices: combo(['4', '6', '9', '12', '16', '20', '24', '30'], '16'),
    slicecrc: combo(['0', '1'], '1'),
    pix_fmt: combo(
      [
        'rgba64le',
        'bgra',
        'yuv420p',
        'yuv422p',
        'yuv444p',
        'yuva420p',
        'yuva422p',
        'yuva444p',
        'yuv420p10le',
        'yuv422p10le',
        'yuv444p10le',
        'yuv420p12le',
        'yuv422p12le',
        'yuv444p12le',
        'yuv420p14le',
        'yuv422p14le',
        'yuv444p14le',
        'yuv420p16le',
        'yuv422p16le',
        'yuv444p16le',
        'gray',
        'gray10le',
        'gray12le',
        'gray16le',
      ],
      'rgba64le',
    ),
    save_metadata: bool(true),
    trim_to_audio: bool(false),
  },
  'video/gifski': { quality: int(1, 100, 90) },
  'video/h264-mp4': {
    pix_fmt: combo(['yuv420p', 'yuv420p10le']),
    crf: int(0, 100, 19),
    save_metadata: bool(true),
    trim_to_audio: bool(false),
  },
  'video/h265-mp4': {
    pix_fmt: combo(['yuv420p10le', 'yuv420p']),
    crf: int(0, 100, 22),
    save_metadata: bool(true),
  },
  'video/nvenc_av1-mp4': NVENC,
  'video/nvenc_h264-mp4': NVENC,
  'video/nvenc_hevc-mp4': NVENC,
  'video/webm': {
    pix_fmt: combo(['yuv420p', 'yuva420p']),
    crf: int(0, 100, 20),
    save_metadata: bool(true),
    trim_to_audio: bool(false),
  },
};

/** gifski is only offered when the server has its binary, so it isn't in the offline list. */
export const VHS_FORMATS = Object.keys(VHS_FORMAT_WIDGETS).filter((format) => format !== 'video/gifski');

const TITLES: Record<string, string> = {
  pix_fmt: 'Pixel Format',
  crf: 'Quality (CRF, lower = better)',
  save_metadata: 'Save Metadata',
  trim_to_audio: 'Trim to Audio',
  lossless: 'Lossless',
  megabit: 'Bitrate in Mbit/s (off = kbit/s)',
  profile: 'Profile',
  dither: 'Dither',
  input_color_depth: 'Input Color Depth',
  level: 'Level',
  coder: 'Coder',
  context: 'Context',
  gop_size: 'Keyframe Interval (frames)',
  slices: 'Slices',
  slicecrc: 'Slice CRC',
  quality: 'Quality (higher = better)',
};

/**
 * A format setting's title. Bitrate carries the unit `megabit` picks (VHS
 * passes `-b:v <n>M` or `<n>K`); anything a newer VHS adds reads as its name.
 */
export function formatWidgetTitle(key: string, inputs: Record<string, unknown>): string {
  if (key === 'bitrate') return inputs.megabit === false ? 'Bitrate (kbit/s)' : 'Bitrate (Mbit/s)';
  return TITLES[key] ?? key.replace(/_/g, ' ').replace(/^\w/, (first) => first.toUpperCase());
}
