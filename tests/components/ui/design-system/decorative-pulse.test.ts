import { pulse } from '@/components/ui/design-system/decorative-pulse';

test('peaks at its phase and fades out within the spread', () => {
  expect(pulse(0.25, 0.25)).toBe(1);
  expect(pulse(0.375, 0.25)).toBeCloseTo(0.5);
  expect(pulse(0.75, 0.25)).toBe(0);
});

test('wraps around the end of the loop', () => {
  expect(pulse(0.95, 0.05)).toBeCloseTo(0.6);
  expect(pulse(0, 1)).toBe(1);
});
