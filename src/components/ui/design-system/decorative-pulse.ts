/** 0–1 glow of an indicator peaking at `peak` on a looping phase; fades out `spread` either side. */
export function pulse(phase: number, peak: number, spread = 0.25) {
  'worklet';
  const offset = Math.abs(phase - peak) % 1;
  return Math.max(0, 1 - Math.min(offset, 1 - offset) / spread);
}
