import {
  batchSaveSummary,
  EMPTY_SELECTION,
  getBatchActions,
  isAllSelected,
  mediaSelectionReducer as reduce,
  type MediaSelectionEvent,
  type MediaSelectionState,
} from '@/features/gallery/utils/media-selection';

const run = (...events: MediaSelectionEvent[]): MediaSelectionState => events.reduce(reduce, EMPTY_SELECTION);

describe('mediaSelectionReducer', () => {
  test('a long-press starts selecting with that item selected', () => {
    expect(run({ type: 'begin', id: 'a' })).toEqual({ active: true, selected: ['a'] });
  });

  test('Select starts selecting with nothing selected', () => {
    expect(run({ type: 'begin' })).toEqual({ active: true, selected: [] });
  });

  test('a tap toggles while selecting, in the order picked', () => {
    const state = run({ type: 'begin', id: 'a' }, { type: 'toggle', id: 'c' }, { type: 'toggle', id: 'b' });
    expect(state.selected).toEqual(['a', 'c', 'b']);
    expect(reduce(state, { type: 'toggle', id: 'c' }).selected).toEqual(['a', 'b']);
  });

  test('a tap outside selection mode selects nothing', () => {
    expect(run({ type: 'toggle', id: 'a' })).toBe(EMPTY_SELECTION);
  });

  test('deselecting the last item keeps selection mode until Cancel', () => {
    const state = run({ type: 'begin', id: 'a' }, { type: 'toggle', id: 'a' });
    expect(state).toEqual({ active: true, selected: [] });
    expect(reduce(state, { type: 'end' })).toEqual(EMPTY_SELECTION);
  });

  test('a long-press while selecting adds the item rather than restarting', () => {
    const state = run({ type: 'begin', id: 'a' }, { type: 'begin', id: 'b' }, { type: 'begin', id: 'a' });
    expect(state.selected).toEqual(['a', 'b']);
  });

  test('select all and deselect all', () => {
    const all = run({ type: 'begin', id: 'b' }, { type: 'selectAll', ids: ['a', 'b', 'c'] });
    expect(all.selected).toEqual(['a', 'b', 'c']);
    expect(reduce(all, { type: 'deselectAll' })).toEqual({ active: true, selected: [] });
  });

  test('items that leave the grid leave the selection', () => {
    const state = run({ type: 'begin', id: 'a' }, { type: 'toggle', id: 'b' }, { type: 'retain', ids: ['b', 'c'] });
    expect(state).toEqual({ active: true, selected: ['b'] });
  });

  test('selection mode ends when the grid it selects from is emptied', () => {
    expect(run({ type: 'begin', id: 'a' }, { type: 'retain', ids: [] })).toEqual(EMPTY_SELECTION);
  });

  test('an unchanged grid keeps the same state object', () => {
    const state = run({ type: 'begin', id: 'a' });
    expect(reduce(state, { type: 'retain', ids: ['a', 'b'] })).toBe(state);
  });
});

test('isAllSelected needs every item and at least one', () => {
  expect(isAllSelected(['a', 'b'], ['b', 'a'])).toBe(true);
  expect(isAllSelected(['a'], ['a', 'b'])).toBe(false);
  expect(isAllSelected([], [])).toBe(false);
});

describe('getBatchActions', () => {
  test('nothing runs with nothing selected', () => {
    expect(getBatchActions({ count: 0, canShare: true })).toEqual([
      { action: 'save', enabled: false },
      { action: 'share', enabled: false },
      { action: 'delete', enabled: false },
    ]);
  });

  test('share takes exactly one item; save and delete take any number', () => {
    expect(getBatchActions({ count: 1, canShare: true }).every((entry) => entry.enabled)).toBe(true);
    expect(getBatchActions({ count: 3, canShare: true })).toEqual([
      { action: 'save', enabled: true },
      { action: 'share', enabled: false },
      { action: 'delete', enabled: true },
    ]);
  });

  test('share is not shown without a share sheet', () => {
    expect(getBatchActions({ count: 1, canShare: false }).map((entry) => entry.action)).toEqual(['save', 'delete']);
  });
});

test('one summary for a batch save', () => {
  expect(batchSaveSummary({ saved: 3, total: 3, web: false })).toBe('Saved 3 items to Photos');
  expect(batchSaveSummary({ saved: 1, total: 1, web: false })).toBe('Saved 1 item to Photos');
  expect(batchSaveSummary({ saved: 2, total: 3, web: false })).toBe('Saved 2 of 3 items to Photos');
  expect(batchSaveSummary({ saved: 2, total: 2, web: true })).toBe('Downloaded 2 items');
});
