import { visibleRegionHeight } from '@/features/generation/utils/visible-region';

describe('visibleRegionHeight', () => {
  it('uses the whole area when nothing covers it', () => {
    expect(visibleRegionHeight(100, 600)).toBe(600);
    expect(visibleRegionHeight(100, 600, Number.POSITIVE_INFINITY)).toBe(600);
    expect(visibleRegionHeight(100, 600, Number.NaN)).toBe(600);
  });

  it('stops at the cover edge, measured from the area top', () => {
    // Sheet top at 40% of an 800pt screen, area starting below a 100pt header.
    expect(visibleRegionHeight(100, 700, 320)).toBe(220);
  });

  it('never exceeds the area when the cover sits below it', () => {
    expect(visibleRegionHeight(100, 600, 900)).toBe(600);
  });

  it('collapses to zero when the cover reaches past the area top', () => {
    expect(visibleRegionHeight(100, 600, 80)).toBe(0);
  });

  it('treats a negative area height as empty', () => {
    expect(visibleRegionHeight(0, -10, 50)).toBe(0);
  });
});
