import { resolveSegmentChange, resolveSegmentIndex } from './segment-value';

// The node parameter contract the native adapter has to preserve: the drawn
// Segments track resolved a value to an index and only wrote back on a real
// change, and the iOS UISegmentedControl path must behave identically.
describe('segment value resolution', () => {
  const CROP = ['disabled', 'center'];
  const SEED = ['Random', 'Fixed'];

  it('selects the segment matching the current value', () => {
    expect(resolveSegmentIndex(CROP, 'disabled')).toBe(0);
    expect(resolveSegmentIndex(CROP, 'center')).toBe(1);
    expect(resolveSegmentIndex(SEED, 'Fixed')).toBe(1);
  });

  it('pins the first segment when the value is not on offer', () => {
    // A workflow saved against another server can carry an enum this build
    // does not list; it must not render as "nothing selected".
    expect(resolveSegmentIndex(CROP, 'bilinear')).toBe(0);
    expect(resolveSegmentIndex(CROP, '')).toBe(0);
  });

  it('commits the option at the tapped index', () => {
    expect(resolveSegmentChange(CROP, 'disabled', 1)).toBe('center');
    expect(resolveSegmentChange(SEED, 'Fixed', 0)).toBe('Random');
  });

  it('writes nothing when the tap does not change the value', () => {
    expect(resolveSegmentChange(CROP, 'center', 1)).toBeUndefined();
  });

  it('writes nothing for an index the options do not cover', () => {
    expect(resolveSegmentChange(CROP, 'disabled', 5)).toBeUndefined();
    expect(resolveSegmentChange(CROP, 'disabled', -1)).toBeUndefined();
  });

  it('resolves by index so repeated labels stay distinguishable', () => {
    const repeated = ['1024 x 1024', '1024 x 1024', '512 x 512'];
    expect(resolveSegmentChange(repeated, '512 x 512', 1)).toBe('1024 x 1024');
    expect(resolveSegmentIndex(repeated, '512 x 512')).toBe(2);
  });
});
