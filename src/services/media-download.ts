import { Directory, DownloadTask, File, Paths, type NetworkTaskSessionType } from 'expo-file-system';
import { AppState, Platform } from 'react-native';
import { diag, redactUrl } from '@/utils/diagnostics';

/**
 * Dev-only A/B switch for timing the two iOS URLSession modes on a device.
 * Set to `'background'` and reload to download through nsurlsessiond as the
 * legacy API did; release builds always use the foreground session.
 */
const DEV_SESSION_OVERRIDE: NetworkTaskSessionType | undefined = undefined;

/** Where results land before `saveGeneratedMedia` moves them into the gallery. */
export const DOWNLOAD_DIRECTORY = 'comfy-downloads';

/** Network failures (and stalls) tolerated per file before giving up. */
export const MAX_DOWNLOAD_ATTEMPTS = 3;

/**
 * A transfer that writes nothing for this long is paused and resumed on a
 * new connection. Pausing is the only way to keep the bytes received so far
 * on iOS: a failed task drops its resume data, and the default request
 * timeout (60 s) would fail it long after a mobile link went quiet.
 */
export const STALL_TIMEOUT_MS = 15_000;
const STALL_CHECK_MS = 2_500;

/**
 * The iOS URLSession a result download runs in.
 *
 * A background session hands each task to nsurlsessiond, out of process,
 * which adds per-task overhead and may schedule the transfer lazily — the
 * suspect for intermittently slow results. The foreground session runs in the
 * app, so a download is paused when the app leaves the foreground and resumed
 * when it returns. Android ignores the option.
 */
export function downloadSessionType(): NetworkTaskSessionType {
  return (__DEV__ && DEV_SESSION_OVERRIDE) || 'foreground';
}

/** The server answered with an error status; retrying will not help. */
export class DownloadHttpError extends Error {
  constructor(
    readonly status: number,
    name: string,
  ) {
    super(`Failed to download ${name} (HTTP ${status})`);
    this.name = 'DownloadHttpError';
  }
}

/**
 * Both native implementations reject a non-2xx response before writing it
 * (iOS: "server returned HTTP 401", Android: "HTTP 401"); the status is only
 * in the message.
 */
function httpStatus(error: unknown): number | undefined {
  const match = /\bHTTP (\d{3})\b/.exec(error instanceof Error ? error.message : String(error));
  return match ? Number(match[1]) : undefined;
}

function isCancellation(error: unknown): boolean {
  return error instanceof Error && (error.name === 'AbortError' || /cancelled/i.test(error.message));
}

/** Enough of a file name to tell downloads apart in logs, not the whole name. */
export function logName(name: string): string {
  const dot = name.lastIndexOf('.');
  const ext = dot > 0 ? name.slice(dot) : '';
  const stem = dot > 0 ? name.slice(0, dot) : name;
  return stem.length > 6 ? `${stem.slice(0, 6)}…${ext}` : name;
}

function abortError(): Error {
  const error = new Error('The operation was aborted.');
  error.name = 'AbortError';
  return error;
}

/** Resolves once the app is in the foreground. */
function untilActive(signal?: AbortSignal): Promise<void> {
  if (AppState.currentState === 'active') return Promise.resolve();
  return new Promise((resolve, reject) => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      signal?.removeEventListener('abort', onAbort);
      subscription.remove();
      resolve();
    });
    const onAbort = () => {
      subscription.remove();
      reject(abortError());
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

export interface CacheDownloadOptions {
  /** The server's file name: picks the extension and labels errors and logs. */
  name: string;
  /** Receives the fraction (0-1) written so far; never moves backwards. */
  onProgress?: (fraction: number) => void;
  signal?: AbortSignal;
}

/**
 * Downloads `url` into `cache/comfy-downloads` and returns the local URI.
 *
 * - On iOS, while the app is in the background a foreground-session transfer
 *   is paused (keeping its resume data) and continues when the app returns.
 *   If the app is killed meanwhile, job recovery downloads the file again.
 * - A stalled transfer is paused and resumed from the bytes already received.
 * - A failed connection is retried: Android resumes from the partial file
 *   with a `Range` request; iOS starts over, since its error has no resume data.
 * - An HTTP error status is not retried. Nothing is left in the cache on failure.
 */
export async function downloadToCache(
  url: string,
  { name, onProgress, signal }: CacheDownloadOptions,
): Promise<string> {
  if (signal?.aborted) throw abortError();

  const directory = new Directory(Paths.cache, DOWNLOAD_DIRECTORY);
  directory.create({ intermediates: true, idempotent: true });
  // A unique name keeps concurrent and retried downloads apart.
  const ext = name.split('.').pop() || 'png';
  const destination = new File(directory, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`);

  const sessionType = downloadSessionType();
  // A background session keeps going without the app; nothing to pause.
  const followAppState = Platform.OS === 'ios' && sessionType === 'foreground';
  const label = logName(name);
  const started = Date.now();

  let reported = 0;
  let lastWrite = Date.now();
  const options = {
    sessionType,
    signal,
    onProgress: ({ bytesWritten, totalBytes }: { bytesWritten: number; totalBytes: number }) => {
      lastWrite = Date.now();
      // Without a Content-Length the total is -1: no fraction to give.
      if (totalBytes <= 0) return;
      const fraction = Math.min(1, bytesWritten / totalBytes);
      if (fraction <= reported) return;
      reported = fraction;
      onProgress?.(fraction);
    },
  };

  let task: DownloadTask = File.createDownloadTask(url, destination, options);
  let pausedFor: 'background' | 'stall' | undefined;
  let attempts = 1;
  let backgroundPauses = 0;

  const pause = (reason: 'background' | 'stall') => {
    // The task reads `active` until the native pause lands; pausing twice
    // would replace the resume data with none.
    if (pausedFor || task.state !== 'active') return;
    pausedFor = reason;
    diag('download', 'pause', { file: label, reason });
    task.pause();
  };
  const appState = followAppState
    ? AppState.addEventListener('change', (state) => {
        if (state === 'background') pause('background');
      })
    : undefined;
  const watchdog = setInterval(() => {
    // Time spent in the background is not a stall: timers barely run there.
    if (AppState.currentState !== 'active') lastWrite = Date.now();
    else if (Date.now() - lastWrite > STALL_TIMEOUT_MS) pause('stall');
  }, STALL_CHECK_MS);

  const start = async (resume: boolean) => {
    if (followAppState) await untilActive(signal);
    lastWrite = Date.now();
    return resume ? task.resumeAsync() : task.downloadAsync();
  };

  /** A fresh task for the next attempt, resuming whatever survives. */
  const nextTask = (): { task: DownloadTask; resume: boolean } => {
    task.release();
    // Android's resume data is the byte offset to request with `Range`; a
    // failed task leaves its partial file in place.
    const partial = Platform.OS === 'android' && destination.exists ? (destination.size ?? 0) : 0;
    if (partial > 0) {
      const state = { url, fileUri: destination.uri, isDirectory: false, resumeData: String(partial) };
      return { task: DownloadTask.fromSavable(state, options), resume: true };
    }
    return { task: File.createDownloadTask(url, destination, options), resume: false };
  };

  const discard = () => {
    try {
      if (destination.exists) destination.delete();
    } catch {
      // Best effort: the cache is the OS's to purge.
    }
  };

  try {
    let run = start(false);
    for (;;) {
      let file: File | null;
      try {
        file = await run;
      } catch (error) {
        const status = httpStatus(error);
        const giveUp =
          signal?.aborted || status !== undefined || isCancellation(error) || attempts >= MAX_DOWNLOAD_ATTEMPTS;
        diag('download', giveUp ? 'failed' : 'retry', {
          file: label,
          ms: Date.now() - started,
          session: sessionType,
          attempt: attempts,
          error: redactUrl(error instanceof Error ? error.message : String(error)),
        });
        if (signal?.aborted) throw abortError();
        if (status !== undefined) throw new DownloadHttpError(status, name);
        if (giveUp) throw error;
        attempts++;
        pausedFor = undefined;
        const next = nextTask();
        task = next.task;
        run = start(next.resume);
        continue;
      }

      if (file) {
        diag('download', 'done', {
          file: label,
          bytes: file.size,
          ms: Date.now() - started,
          session: sessionType,
          attempts,
          backgroundPauses,
        });
        return file.uri;
      }

      // Paused: by the app leaving the foreground, or by the stall watchdog.
      if (pausedFor === 'background') backgroundPauses++;
      else if (++attempts > MAX_DOWNLOAD_ATTEMPTS) throw new Error(`Failed to download ${name} (stalled)`);
      pausedFor = undefined;
      // Pausing before the first byte (or against a server without
      // validators) yields no resume data: start over instead.
      if (task.savable().resumeData) {
        run = start(true);
      } else {
        task.release();
        task = File.createDownloadTask(url, destination, options);
        run = start(false);
      }
    }
  } catch (error) {
    task.cancel();
    discard();
    throw error;
  } finally {
    clearInterval(watchdog);
    appState?.remove();
    task.release();
  }
}
