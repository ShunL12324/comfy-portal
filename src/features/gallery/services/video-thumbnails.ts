import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { createVideoPlayer } from 'expo-video';

import { stillDirectory, stillFile } from './video-still-file';

/**
 * Still frames for video tiles, so a grid never holds a native player just to
 * show a paused first frame. Each still is made once, by a short-lived player
 * that is released straight away, and kept as a JPEG in the cache directory
 * keyed by the video's path. The OS may purge it; it is then made again.
 */

/** Long edge of a still, in pixels: sharp on a four-column tablet tile at 3x. */
const STILL_EDGE = 512;
/** Stills made at once. Each holds a decoder while it runs. */
const CONCURRENCY = 2;

/** A still's file URI, or `null` when the video cannot give one. Absent: not looked up yet. */
const stills = new Map<string, string | null>();
/** Videos whose still has been looked for on disk. */
const looked = new Set<string>();
const pending = new Map<string, Promise<string | null>>();
const listeners = new Set<() => void>();
const queue: (() => void)[] = [];
let running = 0;

function settle(videoUri: string, still: string | null) {
  stills.set(videoUri, still);
  listeners.forEach((listener) => listener());
}

/**
 * The still for a video if it is known or already on disk, without making one.
 * `undefined` means it has not been made yet; `null` that it cannot be.
 */
export function peekVideoStill(videoUri: string): string | null | undefined {
  const known = stills.get(videoUri);
  if (known !== undefined || looked.has(videoUri)) return known;
  // Every tile re-reads on every settled still; the disk is asked once.
  looked.add(videoUri);
  try {
    const file = stillFile(videoUri);
    if (file.exists) {
      stills.set(videoUri, file.uri);
      return file.uri;
    }
  } catch {
    /* Treated as not made yet. */
  }
  return undefined;
}

export function subscribeVideoStills(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

async function makeStill(videoUri: string): Promise<string | null> {
  const player = createVideoPlayer(videoUri);
  try {
    const [frame] = await player.generateThumbnailsAsync(0, { maxWidth: STILL_EDGE, maxHeight: STILL_EDGE });
    if (!frame) return null;
    const image = await ImageManipulator.manipulate(frame).renderAsync();
    const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.8 });
    stillDirectory().create({ intermediates: true, idempotent: true });
    const target = stillFile(videoUri);
    if (target.exists) target.delete();
    await new File(saved.uri).move(target);
    return target.uri;
  } finally {
    player.release();
  }
}

function runNext() {
  while (running < CONCURRENCY && queue.length) {
    running += 1;
    queue.shift()!();
  }
}

/** Makes the still for a video, once, a few at a time; resolves `null` when it cannot. */
export function requestVideoStill(videoUri: string): Promise<string | null> {
  const known = peekVideoStill(videoUri);
  if (known !== undefined) return Promise.resolve(known);
  const inFlight = pending.get(videoUri);
  if (inFlight) return inFlight;
  const job = new Promise<string | null>((resolve) => {
    queue.push(() => {
      makeStill(videoUri)
        .catch(() => null)
        .then((still) => {
          pending.delete(videoUri);
          settle(videoUri, still);
          resolve(still);
          running -= 1;
          runNext();
        });
    });
  });
  pending.set(videoUri, job);
  runNext();
  return job;
}
