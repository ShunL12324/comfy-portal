import {
  buildReadout,
  clampIndex,
  dismissProgress,
  DISMISS_VELOCITY,
  fileTypeLabel,
  formatCounter,
  formatCreated,
  formatDimensions,
  formatDuration,
  getViewerActions,
  pageFromOffset,
  shouldDismiss,
  toViewerItem,
} from '@/features/gallery/components/media-viewer/media-viewer-utils';

describe('toViewerItem', () => {
  test('reads the kind from the extension', () => {
    expect(toViewerItem('file:///out/a.png')).toEqual({ uri: 'file:///out/a.png', kind: 'image' });
    expect(toViewerItem('file:///out/a.MP4')).toEqual({ uri: 'file:///out/a.MP4', kind: 'video' });
  });

  test('carries provenance when the caller has it', () => {
    expect(toViewerItem('file:///out/a.png', { createdAt: 5 })).toEqual({
      uri: 'file:///out/a.png',
      kind: 'image',
      createdAt: 5,
    });
  });
});

describe('clampIndex', () => {
  test('keeps the index inside the list', () => {
    expect(clampIndex(-1, 3)).toBe(0);
    expect(clampIndex(1, 3)).toBe(1);
    expect(clampIndex(5, 3)).toBe(2);
  });

  test('lands on the item that slid into place after the last one was deleted', () => {
    // Viewing index 2 of 3, then deleting it: the list is now 2 long.
    expect(clampIndex(2, 2)).toBe(1);
  });

  test('pins an empty list or a nonsense index to 0', () => {
    expect(clampIndex(4, 0)).toBe(0);
    expect(clampIndex(Number.NaN, 3)).toBe(0);
  });
});

describe('formatCounter', () => {
  test('shows position out of total, one-based, padded to the total', () => {
    expect(formatCounter(0, 12)).toBe('01/12');
    expect(formatCounter(11, 12)).toBe('12/12');
    expect(formatCounter(2, 5)).toBe('3/5');
    expect(formatCounter(6, 120)).toBe('007/120');
  });

  test('is omitted for a single item', () => {
    expect(formatCounter(0, 1)).toBeUndefined();
    expect(formatCounter(0, 0)).toBeUndefined();
  });
});

describe('pageFromOffset', () => {
  test('rounds to the nearest page and clamps to the list', () => {
    expect(pageFromOffset(0, 390, 4)).toBe(0);
    expect(pageFromOffset(390 * 2 + 10, 390, 4)).toBe(2);
    expect(pageFromOffset(390 * 9, 390, 4)).toBe(3);
  });

  test('stays on the first page before the pager is measured', () => {
    expect(pageFromOffset(500, 0, 4)).toBe(0);
  });
});

describe('getViewerActions', () => {
  const base = { canShare: false, canSetThumbnail: false, canDelete: false, kind: 'image' as const };

  test('always offers save', () => {
    expect(getViewerActions(base)).toEqual(['save']);
  });

  test('offers share only where the platform has a share sheet', () => {
    expect(getViewerActions({ ...base, canShare: true })).toEqual(['save', 'share']);
  });

  test('offers delete only where the opening screen supports it, last', () => {
    expect(getViewerActions({ ...base, canShare: true, canSetThumbnail: true, canDelete: true })).toEqual([
      'save',
      'share',
      'thumbnail',
      'delete',
    ]);
  });

  test('never offers a video as a workflow thumbnail', () => {
    expect(getViewerActions({ ...base, canSetThumbnail: true, kind: 'video' })).toEqual(['save']);
  });

  test('shows nothing without an item', () => {
    expect(getViewerActions({ ...base, canShare: true, kind: undefined })).toEqual([]);
  });
});

describe('fileTypeLabel', () => {
  test('reads the extension of a local file', () => {
    expect(fileTypeLabel('file:///media-v2/abc.png')).toBe('PNG');
    expect(fileTypeLabel('file:///media-v2/clip.webm')).toBe('WEBM');
  });

  test('reads the filename of a ComfyUI view URL, not its path', () => {
    expect(fileTypeLabel('http://10.0.0.2:8188/view?filename=ComfyUI_0001_.webp&subfolder=&type=output')).toBe('WEBP');
    expect(fileTypeLabel('https://host/view?type=output&filename=a%20b.mp4')).toBe('MP4');
  });

  test('is omitted without an extension', () => {
    expect(fileTypeLabel('https://host/view?type=output')).toBeUndefined();
    expect(fileTypeLabel('blob:abc')).toBeUndefined();
  });
});

describe('formatDimensions', () => {
  test('joins width and height with a times sign', () => {
    expect(formatDimensions(1024, 1536)).toBe('1024×1536');
  });

  test('is omitted until both sides are known', () => {
    expect(formatDimensions(1024, undefined)).toBeUndefined();
    expect(formatDimensions(0, 10)).toBeUndefined();
  });
});

describe('formatDuration', () => {
  test('uses minutes and seconds, adding hours only when needed', () => {
    expect(formatDuration(5)).toBe('0:05');
    expect(formatDuration(760.4)).toBe('12:40');
    expect(formatDuration(3723)).toBe('1:02:03');
  });

  test('never reads 0:00 for a short clip', () => {
    expect(formatDuration(0.3)).toBe('0:01');
  });

  test('is omitted when unknown', () => {
    expect(formatDuration(undefined)).toBeUndefined();
    expect(formatDuration(0)).toBeUndefined();
    expect(formatDuration(Number.NaN)).toBeUndefined();
  });
});

describe('formatCreated', () => {
  test('formats epoch milliseconds and ISO strings in local time', () => {
    const local = new Date(2026, 8, 30, 14, 2);
    expect(formatCreated(local.getTime())).toBe('2026-09-30 14:02');
    expect(formatCreated(local.toISOString())).toBe('2026-09-30 14:02');
  });

  test('is omitted for a missing or unreadable date', () => {
    expect(formatCreated(undefined)).toBeUndefined();
    expect(formatCreated('')).toBeUndefined();
    expect(formatCreated('not a date')).toBeUndefined();
  });
});

describe('buildReadout', () => {
  const created = new Date(2026, 8, 30, 14, 2).getTime();

  test('identifies the item, then says where it came from', () => {
    const readout = buildReadout({
      item: { uri: 'file:///a.png', kind: 'image', createdAt: created, source: 'Flux portrait' },
      index: 2,
      length: 12,
      info: { width: 1024, height: 1536 },
    });
    expect(readout.lines).toEqual(['03/12   PNG   1024×1536', '2026-09-30 14:02   FLUX PORTRAIT']);
    expect(readout.accessibilityLabel).toBe(
      'Image 3 of 12, PNG, 1024 by 1536, created 2026-09-30 14:02, from Flux portrait',
    );
  });

  test('shows a video length before its frame size', () => {
    const readout = buildReadout({
      item: { uri: 'file:///a.mp4', kind: 'video' },
      index: 0,
      length: 1,
      info: { width: 1280, height: 720, duration: 5 },
    });
    expect(readout.lines).toEqual(['MP4   0:05   1280×720']);
    expect(readout.accessibilityLabel).toBe('Video, MP4, 0:05 long, 1280 by 720');
  });

  test('leaves out what is not known yet and drops an empty line', () => {
    const readout = buildReadout({ item: { uri: 'blob:x', kind: 'image', source: '  ' }, index: 0, length: 1 });
    expect(readout.lines).toEqual([]);
    expect(readout.accessibilityLabel).toBe('Image');
  });
});

describe('swipe-down dismissal', () => {
  test('progress grows with downward travel and ignores upward drags', () => {
    expect(dismissProgress(0, 800)).toBe(0);
    expect(dismissProgress(-50, 800)).toBe(0);
    expect(dismissProgress(80, 800)).toBeCloseTo(0.5);
    expect(dismissProgress(800, 800)).toBe(1);
    expect(dismissProgress(80, 0)).toBe(0);
  });

  test('dismisses past the distance or on a fast downward flick', () => {
    expect(shouldDismiss(160, 0, 800)).toBe(true);
    expect(shouldDismiss(40, DISMISS_VELOCITY, 800)).toBe(true);
    expect(shouldDismiss(40, 200, 800)).toBe(false);
  });

  test('never dismisses on an upward release', () => {
    expect(shouldDismiss(-200, DISMISS_VELOCITY * 2, 800)).toBe(false);
  });
});
