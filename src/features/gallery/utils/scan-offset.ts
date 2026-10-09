/** 0–1 scan line position on a looping phase: top → bottom → top, easing through both ends with no jump at the wrap. */
export function scanOffset(phase: number) {
  'worklet';
  return (1 - Math.cos(2 * Math.PI * phase)) / 2;
}
