/** Decimal precision also covers scientific notation and fractional range origins. */
export function sliderPrecision(value: number): number {
  const [coefficient, exponent = '0'] = String(value).toLowerCase().split('e');
  return Math.min(12, Math.max(0, (coefficient.split('.')[1]?.length ?? 0) - Number(exponent)));
}

/** Valid steps are anchored to the minimum, including when max is off-grid. */
export function normalizeSliderValue(value: number, min: number, max: number, step: number): number {
  const bounded = Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
  if (!(step > 0) || !Number.isFinite(step)) return bounded;
  const precision = Math.max(sliderPrecision(step), sliderPrecision(min));
  const lastStep = Math.floor((max - min) / step + 1e-9);
  const index = Math.min(lastStep, Math.max(0, Math.round((bounded - min) / step)));
  return Number((min + index * step).toFixed(precision));
}

export function parseSliderDraft(text: string): number | null {
  const trimmed = text.trim().replace(',', '.');
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(trimmed)) return null;
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : null;
}
