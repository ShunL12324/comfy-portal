import {
  clampIndex,
  dismissProgress,
  DISMISS_VELOCITY,
  formatCounter,
  getViewerActions,
  indexAfterDelete,
  pageFromOffset,
  shouldDismiss,
  toViewerItem,
} from '@/features/gallery/components/media-viewer/media-viewer-utils';

describe('toViewerItem', () => {
  test('reads the kind from the extension, and carries nothing else', () => {
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

  test('pins an empty list or a nonsense index to 0', () => {
    expect(clampIndex(4, 0)).toBe(0);
    expect(clampIndex(Number.NaN, 3)).toBe(0);
  });
});

describe('indexAfterDelete', () => {
  test('shows the next item, which slid into the same place', () => {
    // Viewing 2 of 4 (index 1) and deleting it: the old third item is now at index 1.
    expect(indexAfterDelete(1, 3)).toBe(1);
    expect(indexAfterDelete(0, 3)).toBe(0);
  });

  test('falls back to the previous item when the last was deleted', () => {
    expect(indexAfterDelete(3, 3)).toBe(2);
  });

  test('has nowhere to go when nothing is left, which closes the viewer', () => {
    expect(indexAfterDelete(0, 0)).toBe(-1);
  });
});

describe('formatCounter', () => {
  test('shows position out of total, one-based', () => {
    expect(formatCounter(2, 12)).toBe('3 / 12');
    expect(formatCounter(0, 2)).toBe('1 / 2');
  });

  test('clamps an index past the end', () => {
    expect(formatCounter(9, 3)).toBe('3 / 3');
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

  test('always offers save, with an empty overflow menu', () => {
    expect(getViewerActions(base)).toEqual({ bar: ['save'], menu: [] });
  });

  test('orders the bar save, share, delete', () => {
    expect(getViewerActions({ ...base, canShare: true, canDelete: true }).bar).toEqual(['save', 'share', 'delete']);
  });

  test('offers share only where the platform has a share sheet', () => {
    expect(getViewerActions({ ...base, canDelete: true }).bar).toEqual(['save', 'delete']);
  });

  test('puts the workflow thumbnail in the overflow menu, never on the bar', () => {
    const actions = getViewerActions({ ...base, canShare: true, canSetThumbnail: true, canDelete: true });
    expect(actions.bar).toEqual(['save', 'share', 'delete']);
    expect(actions.menu).toEqual(['thumbnail']);
  });

  test('never offers a video as a workflow thumbnail, so its menu is empty', () => {
    expect(getViewerActions({ ...base, canSetThumbnail: true, kind: 'video' }).menu).toEqual([]);
  });

  test('shows nothing without an item', () => {
    expect(getViewerActions({ ...base, canShare: true, canDelete: true, kind: undefined })).toEqual({
      bar: [],
      menu: [],
    });
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
