/**
 * Pure logic behind the video loader field (`common/server-video-field`):
 * where an input-folder video is served from, which state the field is in,
 * how it can be previewed here, and what the loader will read from it.
 */

/** A combo value such as `clips/a.mp4` is `a.mp4` in the `clips` subfolder of `input/`. */
export function splitInputPath(value: string): { filename: string; subfolder: string } {
  const slash = value.lastIndexOf('/');
  if (slash < 0) return { filename: value, subfolder: '' };
  return { filename: value.slice(slash + 1), subfolder: value.slice(0, slash) };
}

/**
 * The URL of a file in ComfyUI's `input/` folder. `/view` answers with the
 * file itself (aiohttp's FileResponse: byte ranges and the real `video/*`
 * type), which every player can stream. Its `preview` re-encoding only works
 * on stills, so it is never asked for here. The token rides along as a query
 * parameter because players and image views cannot send headers.
 */
export function inputFileUrl(viewBase: string, value: string, token?: string): string {
  const { filename, subfolder } = splitInputPath(value);
  const params = new URLSearchParams({ filename, type: 'input', subfolder });
  if (token) params.append('token', token);
  return `${viewBase}?${params.toString()}`;
}

/**
 * A server file's version as `/view` describes it: `Content-Length` and
 * `Last-Modified` (aiohttp's FileResponse sends both, also to `HEAD`). `null`
 * when neither is there, e.g. behind a proxy that strips them.
 */
export function inputFileVersion(headers: { get(name: string): string | null }): string | null {
  const size = headers.get('content-length');
  const modified = headers.get('last-modified');
  if (!size && !modified) return null;
  return `${size ?? ''}@${modified ?? ''}`;
}

/**
 * The cache key of an input video's still: the file's URL without the token
 * (which can change without the file changing), plus its version, so a file
 * overwritten under the same name gets a new still.
 */
export function inputStillKey(viewBase: string, value: string, version: string | null): string {
  const url = inputFileUrl(viewBase, value);
  return version ? `${url}#${version}` : url;
}

/** `/vhs/queryvideo`: VideoHelperSuite's own metadata probe, which its node preview uses too. */
export function videoInfoUrl(queryBase: string, value: string): string {
  const { filename, subfolder } = splitInputPath(value);
  return `${queryBase}?${new URLSearchParams({ filename, type: 'input', subfolder }).toString()}`;
}

export type VideoFieldState =
  | { kind: 'empty' }
  | { kind: 'selected'; filename: string }
  | { kind: 'missing'; filename: string }
  | { kind: 'uploading'; progress: number; filename?: string };

/**
 * What the field shows. An upload in flight wins (over whatever it will
 * replace); a cancelled one simply stops being in flight, which falls back to
 * the previous selection. A filename the server's combo doesn't list is not
 * in `input/` — reported rather than left to fail as a black preview. While
 * the server's list is unknown the value is trusted.
 */
export function videoFieldState(
  value: unknown,
  serverFiles: readonly string[] | undefined,
  uploadProgress: number | null,
): VideoFieldState {
  const filename = typeof value === 'string' && value ? value : undefined;
  if (uploadProgress !== null) return { kind: 'uploading', progress: uploadProgress, filename };
  if (!filename) return { kind: 'empty' };
  if (serverFiles && !serverFiles.includes(filename)) return { kind: 'missing', filename };
  return { kind: 'selected', filename };
}

/** `uploadImage` rejects with this wording when its task is cancelled. */
export function isUploadCancelled(error: unknown): boolean {
  return error instanceof Error && error.message.includes('canceled');
}

/** How a loader input can be previewed on this platform. */
export type PreviewKind = 'video' | 'image' | 'none';

/**
 * VHS accepts webm, mp4, mkv, gif and mov. A GIF is an animated image to the
 * image view and is shown as one; iOS's player has no WebM or Matroska
 * support, so those get no preview there rather than a black player.
 */
export function previewKindFor(filename: string, os: string): PreviewKind {
  const extension = filename.split('.').pop()?.toLowerCase() ?? '';
  if (extension === 'gif') return 'image';
  if (os === 'ios' && (extension === 'webm' || extension === 'mkv')) return 'none';
  return 'video';
}

/** `0:03`, `12:40`, `1:02:03`. */
export function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}

/** The source as `/vhs/queryvideo` reports it. */
export interface VideoSource {
  duration: number;
  fps: number;
  width?: number;
  height?: number;
}

/** Reads `/vhs/queryvideo`'s answer; anything unusable is `null` (old VHS, unreadable file). */
export function parseVideoInfo(json: unknown): VideoSource | null {
  const source = (json as { source?: Record<string, unknown> } | null)?.source;
  if (!source) return null;
  const duration = Number(source.duration);
  const fps = Number(source.fps);
  if (!Number.isFinite(duration) || !Number.isFinite(fps) || duration <= 0 || fps <= 0) return null;
  const size = Array.isArray(source.size) ? source.size.map(Number) : [];
  const [width, height] = size.length === 2 && size.every(Number.isFinite) ? size : [];
  return { duration, fps, width, height };
}

/**
 * The trim settings that decide how many frames a loader reads. Each loader
 * names its own subset; absent ones don't apply. 0 means "off" for all but
 * `selectEveryNth`, as in VHS.
 */
export interface LoadParams {
  startTime?: number;
  skipFirstFrames?: number;
  duration?: number;
  frameLoadCap?: number;
  forceRate?: number;
  selectEveryNth?: number;
}

/** Input keys behind each trim setting. */
const LOAD_PARAM_KEYS: Record<keyof LoadParams, string> = {
  startTime: 'start_time',
  skipFirstFrames: 'skip_first_frames',
  duration: 'duration',
  frameLoadCap: 'frame_load_cap',
  forceRate: 'force_rate',
  selectEveryNth: 'select_every_nth',
};

/**
 * The node's trim settings, or `null` when one is wired to another node: its
 * value is only known at run time, so no estimate can be made.
 */
export function readLoadParams(inputs: Record<string, unknown>): LoadParams | null {
  const params: LoadParams = {};
  for (const [param, key] of Object.entries(LOAD_PARAM_KEYS) as [keyof LoadParams, string][]) {
    const value = inputs[key];
    if (value === undefined) continue;
    if (Array.isArray(value)) return null;
    const number = typeof value === 'number' ? value : Number(value);
    if (Number.isFinite(number)) params[param] = number;
  }
  return params;
}

/**
 * Roughly how many frames the loader will output, following VHS: resample to
 * the forced rate, skip the start, stop after the duration, keep every nth,
 * cap. An estimate (VHS rounds per frame), so it is shown with `≈`.
 */
export function estimateLoadedFrames(source: VideoSource, params: LoadParams): number {
  const fps = params.forceRate && params.forceRate > 0 ? params.forceRate : source.fps;
  let seconds = source.duration - Math.max(0, params.startTime ?? 0);
  seconds -= Math.max(0, params.skipFirstFrames ?? 0) / fps;
  if (params.duration && params.duration > 0) seconds = Math.min(seconds, params.duration);
  const frames = Math.max(0, Math.round(seconds * fps));
  const nth = Math.max(1, Math.round(params.selectEveryNth ?? 1));
  let kept = Math.ceil(frames / nth);
  if (params.frameLoadCap && params.frameLoadCap > 0) kept = Math.min(kept, params.frameLoadCap);
  return kept;
}

/** `320×240 · 24 fps · ≈72 frames`: the line under the file name. */
export function describeVideo(source: VideoSource, params: LoadParams | null): string {
  const parts: string[] = [];
  if (source.width && source.height) parts.push(`${source.width}×${source.height}`);
  parts.push(`${Number(source.fps.toFixed(2))} fps`);
  if (params) {
    const frames = estimateLoadedFrames(source, params);
    parts.push(`≈${frames} ${frames === 1 ? 'frame' : 'frames'}`);
  }
  return parts.join(' · ');
}
