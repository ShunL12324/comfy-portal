import { galleryTilt, tiltSmoothing } from './gallery-tilt';

test('calibrates to the initial holding angle and clamps large movements', () => {
  expect(galleryTilt(1, 4, 1, 4)).toEqual({ x: 0, y: 0, rotation: 0 });
  expect(galleryTilt(100, -100, 0, 0)).toEqual({ x: 7, y: -3, rotation: 2.3 });
  expect(galleryTilt(-100, 100, 0, 0)).toEqual({ x: -7, y: 3, rotation: -2.3 });
});
test('smoothing does not overshoot, including after a long paused frame', () => {
  for (const delta of [0, 8, 16, 32, 10000]) {
    expect(tiltSmoothing(delta)).toBeGreaterThanOrEqual(0);
    expect(tiltSmoothing(delta)).toBeLessThan(1);
  }
});
