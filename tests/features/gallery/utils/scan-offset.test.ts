import { scanOffset } from '@/features/gallery/utils/scan-offset';

test('sweeps from the top to the bottom and back', () => {
  expect(scanOffset(0)).toBe(0);
  expect(scanOffset(0.25)).toBeCloseTo(0.5);
  expect(scanOffset(0.5)).toBe(1);
  expect(scanOffset(0.75)).toBeCloseTo(0.5);
});

test('meets itself at the loop boundary with no jump', () => {
  expect(scanOffset(1)).toBeCloseTo(scanOffset(0));
  expect(scanOffset(0.999)).toBeCloseTo(scanOffset(0.001));
});

test('rests about a third of the way down', () => {
  expect(scanOffset(0.2)).toBeCloseTo(1 / 3, 1);
});
