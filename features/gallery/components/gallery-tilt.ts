export function galleryTilt(x: number, z: number, neutralX: number, neutralZ: number) {
  'worklet';
  const horizontal = Math.max(-1, Math.min(1, (x - neutralX) / 2.5));
  const vertical = Math.max(-1, Math.min(1, (z - neutralZ) / 3));
  return { x: horizontal * 7, y: vertical * 3, rotation: horizontal * 2.3 };
}
export function tiltSmoothing(deltaMs: number) {
  'worklet';
  return 1 - Math.exp(-Math.min(64, Math.max(0, deltaMs)) / 120);
}
