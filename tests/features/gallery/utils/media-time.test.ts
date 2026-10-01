import { compareMediaTimeDesc, mediaTime, resolveMediaTimestamp } from '@/features/gallery/utils/media-time';

const SEP_30 = Date.UTC(2026, 8, 30, 14, 22);

describe('mediaTime', () => {
  test('reads ISO strings, epoch milliseconds, epoch seconds and numeric strings alike', () => {
    expect(mediaTime('2026-09-30T14:22:00.000Z')).toBe(SEP_30);
    expect(mediaTime(SEP_30)).toBe(SEP_30);
    // Seconds read as milliseconds land in January 1970.
    expect(mediaTime(SEP_30 / 1000)).toBe(SEP_30);
    expect(mediaTime(String(SEP_30))).toBe(SEP_30);
  });

  test('treats the epoch, as written by older indexing, as unknown', () => {
    expect(mediaTime('1970-01-01T00:00:00.000Z')).toBeUndefined();
    expect(mediaTime(0)).toBeUndefined();
  });

  test('is unknown for missing or unreadable values', () => {
    expect(mediaTime(undefined)).toBeUndefined();
    expect(mediaTime(null)).toBeUndefined();
    expect(mediaTime('')).toBeUndefined();
    expect(mediaTime('yesterday')).toBeUndefined();
    expect(mediaTime({})).toBeUndefined();
  });
});

describe('resolveMediaTimestamp', () => {
  const now = Date.UTC(2026, 9, 1);

  test('prefers the recorded time, then the legacy filename, then the file', () => {
    expect(resolveMediaTimestamp({ recorded: SEP_30, fromName: '2025-01-01T00:00:00.000Z', fileTime: 1, now })).toBe(
      '2026-09-30T14:22:00.000Z',
    );
    expect(resolveMediaTimestamp({ fromName: '2025-01-01T00:00:00.000Z', fileTime: SEP_30, now })).toBe(
      '2025-01-01T00:00:00.000Z',
    );
    expect(resolveMediaTimestamp({ fileTime: SEP_30, now })).toBe('2026-09-30T14:22:00.000Z');
  });

  test('an orphan with no sidecar is dated from its file, never 1970', () => {
    // The device index held adopted pool files stamped 1970-01-01 this way.
    const stamped = resolveMediaTimestamp({ recorded: undefined, fromName: undefined, fileTime: SEP_30, now });
    expect(new Date(stamped).getUTCFullYear()).toBe(2026);
    expect(resolveMediaTimestamp({ recorded: '1970-01-01T00:00:00.000Z', fileTime: null, now })).toBe(
      new Date(now).toISOString(),
    );
  });
});

test('sorts newest first, with undated assets last', () => {
  const values = ['2026-01-01T00:00:00Z', '1970-01-01T00:00:00.000Z', SEP_30, '2025-06-01T00:00:00Z'];
  expect([...values].sort(compareMediaTimeDesc)).toEqual([
    SEP_30,
    '2026-01-01T00:00:00Z',
    '2025-06-01T00:00:00Z',
    '1970-01-01T00:00:00.000Z',
  ]);
});
