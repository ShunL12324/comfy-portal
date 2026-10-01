import {
  clampIndex,
  formatCounter,
  getViewerActions,
  pageFromOffset,
  toViewerItem,
} from '@/features/gallery/components/media-viewer/media-viewer-utils';

describe('toViewerItem', () => {
  test('reads the kind from the extension', () => {
    expect(toViewerItem('file:///out/a.png')).toEqual({ uri: 'file:///out/a.png', kind: 'image' });
    expect(toViewerItem('file:///out/a.MP4')).toEqual({ uri: 'file:///out/a.MP4', kind: 'video' });
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
  test('shows position out of total, one-based', () => {
    expect(formatCounter(0, 12)).toBe('1 / 12');
    expect(formatCounter(11, 12)).toBe('12 / 12');
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
