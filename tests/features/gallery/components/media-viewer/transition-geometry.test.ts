import {
  fitRect,
  isRectVisible,
  isUsableRect,
  lerpRect,
  measureInWindow,
  offsetRect,
  visibleShare,
} from '@/features/gallery/components/media-viewer/transition-geometry';

const screen = { x: 0, y: 0, width: 400, height: 800 };

describe('fitRect', () => {
  test('a wide image spans the width and is centred vertically', () => {
    expect(fitRect(2, { width: 400, height: 800 })).toEqual({ x: 0, y: 300, width: 400, height: 200 });
  });

  test('a tall image spans the height and is centred horizontally', () => {
    expect(fitRect(0.25, { width: 400, height: 800 })).toEqual({ x: 100, y: 0, width: 200, height: 800 });
  });

  test('an image of the same shape fills the bounds exactly', () => {
    expect(fitRect(0.5, { width: 400, height: 800 })).toEqual(screen);
  });

  test('an unknown aspect falls back to the whole bounds', () => {
    expect(fitRect(0, { width: 400, height: 800 })).toEqual(screen);
    expect(fitRect(Number.NaN, { width: 400, height: 800 })).toEqual(screen);
  });
});

describe('lerpRect', () => {
  const from = { x: 10, y: 20, width: 100, height: 100 };
  const to = { x: 0, y: 0, width: 400, height: 300 };

  test('starts at the origin and ends at the target', () => {
    expect(lerpRect(from, to, 0)).toEqual(from);
    expect(lerpRect(from, to, 1)).toEqual(to);
  });

  test('moves every edge proportionally', () => {
    expect(lerpRect(from, to, 0.5)).toEqual({ x: 5, y: 10, width: 250, height: 200 });
  });
});

describe('offsetRect', () => {
  test('moves without resizing', () => {
    expect(offsetRect({ x: 1, y: 2, width: 3, height: 4 }, 10, -20)).toEqual({ x: 11, y: -18, width: 3, height: 4 });
  });
});

describe('visibleShare and isRectVisible', () => {
  test('a tile fully on screen is wholly visible', () => {
    const tile = { x: 20, y: 100, width: 120, height: 120 };
    expect(visibleShare(tile, screen)).toBe(1);
    expect(isRectVisible(tile, screen)).toBe(true);
  });

  test('a tile scrolled mostly out of the list does not count', () => {
    const list = { x: 0, y: 100, width: 400, height: 700 };
    const tile = { x: 20, y: 20, width: 120, height: 120 };
    expect(visibleShare(tile, list)).toBeCloseTo(40 / 120);
    expect(isRectVisible(tile, screen, list)).toBe(false);
  });

  test('a tile half inside still counts', () => {
    expect(isRectVisible({ x: 0, y: 740, width: 120, height: 120 }, screen)).toBe(true);
  });

  test('a tile entirely off screen, or with no size, is not visible', () => {
    expect(visibleShare({ x: 0, y: 900, width: 120, height: 120 }, screen)).toBe(0);
    expect(visibleShare({ x: 0, y: 0, width: 0, height: 0 }, screen)).toBe(0);
  });
});

describe('isUsableRect', () => {
  test('rejects empty, missing and non-finite frames', () => {
    expect(isUsableRect({ x: 0, y: 0, width: 1, height: 1 })).toBe(true);
    expect(isUsableRect(undefined)).toBe(false);
    expect(isUsableRect({ x: 0, y: 0, width: 0, height: 10 })).toBe(false);
    expect(isUsableRect({ x: Number.NaN, y: 0, width: 10, height: 10 })).toBe(false);
  });
});

describe('measureInWindow', () => {
  test('resolves the measured frame', async () => {
    const view = { measureInWindow: (cb: (...args: number[]) => void) => cb(1, 2, 3, 4) };
    await expect(measureInWindow(view)).resolves.toEqual({ x: 1, y: 2, width: 3, height: 4 });
  });

  test('resolves nothing for a view without a frame', async () => {
    const view = { measureInWindow: (cb: (...args: number[]) => void) => cb(0, 0, 0, 0) };
    await expect(measureInWindow(view)).resolves.toBeUndefined();
  });
});
