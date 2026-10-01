/**
 * Numbers below this are epoch seconds, not milliseconds: 1e11 ms is 1973,
 * while 1e11 s is far beyond any real date.
 */
const SECONDS_LIMIT = 1e11;

/**
 * When an asset was made, in epoch milliseconds, or nothing when that is not
 * known. Reads ISO strings, epoch milliseconds, epoch seconds and numeric
 * strings. The epoch itself counts as unknown: older indexing wrote
 * 1970-01-01 for files it could not date, and no generated media is that old.
 */
export function mediaTime(value: unknown): number | undefined {
  let ms: number;
  if (typeof value === 'number') ms = value;
  else if (typeof value === 'string' && value.trim() !== '') {
    const numeric = Number(value);
    ms = Number.isFinite(numeric) ? numeric : new Date(value).getTime();
  } else return undefined;
  if (!Number.isFinite(ms) || ms <= 0) return undefined;
  return ms < SECONDS_LIMIT ? ms * 1000 : ms;
}

/** Newest first; undated assets sink to the end in a stable order. */
export function compareMediaTimeDesc(a: unknown, b: unknown): number {
  return (mediaTime(b) ?? 0) - (mediaTime(a) ?? 0);
}

/**
 * The ISO timestamp to index an asset under, from the best evidence there is:
 * what its metadata recorded, then the time in its legacy filename, then the
 * file's own creation or modification time. Only with none of those does it
 * fall back to now; never to the epoch, which read as "1970" everywhere.
 */
export function resolveMediaTimestamp({
  recorded,
  fromName,
  fileTime,
  now = Date.now(),
}: {
  recorded?: unknown;
  fromName?: string;
  fileTime?: number | null;
  now?: number;
}): string {
  const ms = mediaTime(recorded) ?? mediaTime(fromName) ?? mediaTime(fileTime ?? undefined) ?? now;
  return new Date(ms).toISOString();
}
