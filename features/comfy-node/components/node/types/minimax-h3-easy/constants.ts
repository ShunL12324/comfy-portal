/**
 * Input options for ComfyUI-MiniMaxH3-Easy.
 *
 * Values mirror the constants in the extension's `nodes.py` exactly — the
 * server validates against these ids, not against the labels shown here.
 */

export interface Option {
  value: string;
  label: string;
  description?: string;
}

export const MODE_OPTIONS: Option[] = [
  { value: 'image', label: 'Image', description: 'Text-to-video, or first/last frame from up to two images' },
  { value: 'reference', label: 'Reference', description: 'Reference video from mixed image, video and audio media' },
];

export const RESOLUTION_OPTIONS: Option[] = [
  { value: '360P', label: '360P' },
  { value: '416P', label: '416P' },
  { value: '480P', label: '480P' },
  { value: '540P', label: '540P' },
  { value: '640P', label: '640P' },
  { value: '720P', label: '720P' },
  { value: '768P', label: '768P' },
  { value: '832P', label: '832P' },
  { value: '928P', label: '928P' },
  { value: '1024P', label: '1024P' },
  { value: '1080P', label: '1080P' },
  { value: 'custom', label: 'Custom' },
];

export const ASPECT_RATIO_OPTIONS: Option[] = [
  { value: '1:1', label: '1:1', description: 'Square' },
  { value: '2:3', label: '2:3', description: 'Photo portrait' },
  { value: '3:2', label: '3:2', description: 'Photo' },
  { value: '3:4', label: '3:4', description: 'Standard portrait' },
  { value: '4:3', label: '4:3', description: 'Standard' },
  { value: '9:16', label: '9:16', description: 'Widescreen portrait' },
  { value: '16:9', label: '16:9', description: 'Widescreen' },
  { value: '21:9', label: '21:9', description: 'Ultrawide' },
];

export const KEYFRAME_ROLE_OPTIONS: Option[] = [
  { value: 'first', label: 'First frame', description: 'A single image starts the video' },
  { value: 'last', label: 'Last frame', description: 'A single image ends the video' },
];

export const REF_IMAGE_SIZE_OPTIONS: Option[] = [
  { value: 'match', label: 'Match generation size' },
  { value: '1k', label: '1K area', description: '~1 MP' },
  { value: '1.5k', label: '1.5K area', description: '~2.25 MP' },
  { value: '2k', label: '2K area', description: '~4 MP' },
  { value: 'original', label: 'Original' },
];

export const REFERENCE_MENTION_OPTIONS: Option[] = [
  { value: 'index', label: 'By index' },
  { value: 'filename', label: 'By filename' },
];

/**
 * Scene guides come from the extension's `prompt_guides/manifest.json`, so a
 * newer install may offer more than these. `withCurrentValue` keeps whatever
 * the workflow already holds selectable rather than silently dropping it.
 */
export const SCENE_GUIDE_OPTIONS: Option[] = [
  { value: 'none', label: 'None' },
  { value: '3d_animation_short', label: '3D Animation Short' },
  { value: 'brand_promo', label: 'Brand Promo' },
  { value: 'coop_game_intro', label: 'Co-op Game Intro' },
  { value: 'handdrawn_live', label: 'Hand-drawn Live' },
  { value: 'minimalist_product_ad', label: 'Minimalist Product Ad' },
  { value: 'music_video_subtitle', label: 'Music Video Subtitle' },
  { value: 'paper_collage', label: 'Paper Collage' },
  { value: 'papercraft_stop_motion', label: 'Papercraft Stop Motion' },
];

/**
 * Ensure the workflow's current value is always selectable.
 *
 * Guards against two cases: a server whose extension offers options we don't
 * know about, and a workflow carrying a stale value the server would reject —
 * both stay visible so the user can see and correct what is set.
 */
export function withCurrentValue(options: Option[], value: unknown): Option[] {
  if (typeof value !== 'string' || !value) return options;
  if (options.some((option) => option.value === value)) return options;
  return [...options, { value, label: value, description: 'Not offered by this server' }];
}

export const SECONDS_MIN = 0.2;
export const SECONDS_MAX = 30;
export const FPS_MIN = 1;
export const FPS_MAX = 120;
export const DIMENSION_MIN = 32;
export const DIMENSION_MAX = 16384;
export const DIMENSION_STEP = 32;

export const MAX_IMAGES = 9;
export const MAX_VIDEOS = 3;
export const MAX_AUDIOS = 3;
