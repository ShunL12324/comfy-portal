/**
 * Pure logic behind the audio loader field (`common/server-audio-field`).
 * The file's URL and the field's states are the video field's (`input-video`):
 * Load Audio's combo is built from `input/` the same way.
 */
import { formatDuration } from './input-video';

/**
 * Whether this device's player can play a file. Load Audio lists audio and
 * video files alike, and decodes them with PyAV, which reads far more than
 * AVPlayer does: iOS has no Ogg, Opus, WebM, Matroska or WMA support, and
 * Android none for WMA. The web's support varies by browser, so it tries.
 */
export function audioPlayableOn(filename: string, os: string): boolean {
  const extension = filename.split('.').pop()?.toLowerCase() ?? '';
  if (os === 'ios') return !['ogg', 'oga', 'opus', 'webm', 'mkv', 'wma'].includes(extension);
  if (os === 'android') return extension !== 'wma';
  return true;
}

/**
 * The time under the file name: `1:03` before it plays, `0:12 / 1:03` once it
 * has, `0:12` if the length is unknown, and nothing when neither is known.
 */
export function audioTimeLabel(position: number | null, duration: number | null | undefined): string {
  const total = duration && duration > 0 ? formatDuration(duration) : null;
  if (position === null) return total ?? '';
  return total ? `${formatDuration(position)} / ${total}` : formatDuration(position);
}

/** How far through the file playback is, 0–1; 0 while the length is unknown. */
export function audioProgress(position: number | null, duration: number | null | undefined): number {
  if (position === null || !duration || duration <= 0) return 0;
  return Math.min(1, Math.max(0, position / duration));
}
