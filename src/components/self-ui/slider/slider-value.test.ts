import { normalizeSliderValue, parseSliderDraft, sliderPrecision } from './slider-value';

describe('slider manual values', () => {
  it.each([
    [99, 0, 20, 1, 20],
    [-5, 0, 20, 1, 0],
    [7.3, 0, 20, 1, 7],
    [0.76, 0, 1, 0.1, 0.8],
    [0.34, 0.05, 1, 0.1, 0.35],
    [1, 0, 1, 0.3, 0.9],
    [-0.76, -1, 1, 0.1, -0.8],
    [3.6e-7, 0, 1e-6, 1e-7, 4e-7],
  ])('constrains %s to [%s,%s] at step %s', (value, min, max, step, expected) => {
    expect(normalizeSliderValue(value, min, max, step)).toBe(expected);
  });
  it.each(['', ' ', '-', '.', '1.2.3', 'Infinity', '3abc'])('rejects incomplete draft %s', (text) => {
    expect(parseSliderDraft(text)).toBeNull();
  });
  it('accepts signed decimals and decimal comma', () => {
    expect(parseSliderDraft('-0.25')).toBe(-0.25);
    expect(parseSliderDraft('0,75')).toBe(0.75);
    expect(sliderPrecision(1e-7)).toBe(7);
  });
});
