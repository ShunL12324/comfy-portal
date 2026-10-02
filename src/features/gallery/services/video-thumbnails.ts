import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { createVideoPlayer } from 'expo-video';

import { stillDirectory, stillFile } from './video-still-file';

/**
 * Still frames for video tiles, so a grid never holds a native player just to
 * show a paused first frame. Each still is made once, by a short-lived player
 * that is released straight away, and kept as a JPEG in the cache directory
 * keyed by the video's path. The OS may purge it; it is then made again.
 *
 * A still is cached under its key, which is the video's URI unless the caller
 * names another: a server file whose URL stays the same while its bytes change
 * is keyed by its size and modification time instead.
 */

/** Long edge of a still, in pixels: sharp on a four-column tablet tile at 3x. */
const STILL_EDGE = 512;
/** Stills made at once. Each holds a decoder while it runs. */
const CONCURRENCY = 2;

/** A still's file URI, or `null` when the video cannot give one. Absent: not looked up yet. */
const stills = new Map<string, string | null>();
/** Keys whose still has been looked for on disk. */
const looked = new Set<string>();
interface Job {
  promise: Promise<string | null | undefined>;
  /** Requests still waiting; when the last one gives up, a job that hasn't started is dropped. */
  waiters: number;
  started: boolean;
  start: () => void;
  drop: () => void;
}
const pending = new Map<string, Job>();
const listeners = new Set<() => void>();
const queue: Job[] = [];
let running = 0;

export interface VideoStillOptions {
  /** Cache identity, when it isn't the URI itself. */
  key?: string;
  /** Aborting gives up the request; the still is not made if nobody else wants it. */
  signal?: AbortSignal;
}

function settle(key: string, still: string | null) {
  stills.set(key, still);
  listeners.forEach((listener) => listener());
}

/**
 * The still under a key (a video's URI by default) if it is known or already
 * on disk, without making one. `undefined` means it has not been made yet;
 * `null` that it cannot be.
 */
export function peekVideoStill(key: string): string | null | undefined {
  const known = stills.get(key);
  if (known !== undefined || looked.has(key)) return known;
  // Every tile re-reads on every settled still; the disk is asked once.
  looked.add(key);
  try {
    const file = stillFile(key);
    if (file.exists) {
      stills.set(key, file.uri);
      return file.uri;
    }
  } catch {
    /* Treated as not made yet. */
  }
  return undefined;
}

/**
 * Drops a video's still so the next look makes it again: for a URL whose
 * content changed under it, such as a server input file overwritten by an upload.
 */
export function forgetVideoStill(key: string) {
  if (pending.has(key)) return;
  stills.delete(key);
  looked.delete(key);
  try {
    const file = stillFile(key);
    if (file.exists) file.delete();
  } catch {
    /* Nothing cached. */
  }
  listeners.forEach((listener) => listener());
}

export function subscribeVideoStills(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

async function makeStill(videoUri: string, key: string): Promise<string | null> {
  const player = createVideoPlayer(videoUri);
  try {
    const [frame] = await player.generateThumbnailsAsync(0, { maxWidth: STILL_EDGE, maxHeight: STILL_EDGE });
    if (!frame) return null;
    const image = await ImageManipulator.manipulate(frame).renderAsync();
    const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.8 });
    stillDirectory().create({ intermediates: true, idempotent: true });
    const target = stillFile(key);
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
    queue.shift()!.start();
  }
}

/**
 * Makes the still for a video, once, a few at a time. Resolves `null` when it
 * cannot be made, and `undefined` when the request was aborted before its turn.
 */
export function requestVideoStill(
  videoUri: string,
  { key = videoUri, signal }: VideoStillOptions = {},
): Promise<string | null | undefined> {
  const known = peekVideoStill(key);
  if (known !== undefined) return Promise.resolve(known);
  if (signal?.aborted) return Promise.resolve(undefined);
  let job = pending.get(key);
  if (!job) {
    let resolveJob: (still: string | null | undefined) => void = () => {};
    const created: Job = {
      promise: new Promise((resolve) => {
        resolveJob = resolve;
      }),
      waiters: 0,
      started: false,
      start: () => {
        created.started = true;
        makeStill(videoUri, key)
          .catch(() => null)
          .then((still) => {
            pending.delete(key);
            settle(key, still);
            resolveJob(still);
            running -= 1;
            runNext();
          });
      },
      drop: () => {
        queue.splice(queue.indexOf(created), 1);
        pending.delete(key);
        resolveJob(undefined);
      },
    };
    job = created;
    pending.set(key, job);
    queue.push(job);
  }
  const current = job;
  current.waiters += 1;
  signal?.addEventListener(
    'abort',
    () => {
      current.waiters -= 1;
      if (current.waiters === 0 && !current.started) current.drop();
    },
    { once: true },
  );
  runNext();
  return current.promise;
}
