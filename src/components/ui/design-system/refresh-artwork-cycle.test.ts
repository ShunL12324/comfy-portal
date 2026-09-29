import { createArtworkCycle } from './refresh-artwork-cycle';

test('visits all artworks before repeating and never repeats at bag boundaries', () => {
  const next = createArtworkCycle(12, () => 0.999);
  const values = Array.from({ length: 120 }, next);
  for (let i = 1; i < values.length; i++) expect(values[i]).not.toBe(values[i - 1]);
  for (let i = 0; i < values.length; i += 12) expect(new Set(values.slice(i, i + 12)).size).toBe(12);
});
test('supports a single artwork', () => {
  const next = createArtworkCycle(1);
  expect(next()).toBe(0);
  expect(next()).toBe(0);
});
