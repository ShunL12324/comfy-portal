import { createVisibleRows } from '@/features/comfy-node/utils/visible-rows';

test('rows learn when they come on and off screen', () => {
  const rows = createVisibleRows();
  const listener = jest.fn();
  const unsubscribe = rows.subscribe(listener);

  rows.update(['a.mp4', 'b.mp4']);
  expect(rows.has('a.mp4')).toBe(true);
  expect(rows.has('c.mp4')).toBe(false);
  expect(listener).toHaveBeenCalledTimes(1);

  rows.update(['b.mp4', 'c.mp4']);
  expect(rows.has('a.mp4')).toBe(false);
  expect(rows.has('c.mp4')).toBe(true);
  expect(listener).toHaveBeenCalledTimes(2);

  unsubscribe();
  rows.update([]);
  expect(listener).toHaveBeenCalledTimes(2);
});

test('the same rows reported again notify nobody', () => {
  const rows = createVisibleRows();
  rows.update(['a.mp4']);
  const listener = jest.fn();
  rows.subscribe(listener);
  rows.update(['a.mp4']);
  expect(listener).not.toHaveBeenCalled();
});
