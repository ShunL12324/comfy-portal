/**
 * Height of the part of a result area that is not covered by an overlay rising
 * from below (the Run page's node sheet).
 *
 * `areaTop` and `coverTop` share one coordinate space: the sheet reports its
 * top edge relative to the screen container, and the area's `onLayout` y is
 * relative to the same parent. Without a usable cover position (no sheet, or
 * before it has laid out) the whole area is visible.
 */
export function visibleRegionHeight(areaTop: number, areaHeight: number, coverTop?: number): number {
  'worklet';
  const height = Math.max(0, areaHeight);
  if (coverTop === undefined || !Number.isFinite(coverTop)) return height;
  return Math.min(height, Math.max(0, coverTop - areaTop));
}
