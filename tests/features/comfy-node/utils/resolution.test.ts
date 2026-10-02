import { parseAspectRatio, resolutionFor, roundHalfEven } from '@/features/comfy-node/utils/resolution';

describe('parseAspectRatio', () => {
  it('reads the ratio from a labelled option', () => {
    expect(parseAspectRatio('16:9 (Widescreen)')).toEqual([16, 9]);
    expect(parseAspectRatio('2:3 (Portrait Photo)')).toEqual([2, 3]);
    expect(parseAspectRatio('1:1')).toEqual([1, 1]);
  });

  it('rejects labels without a ratio', () => {
    expect(parseAspectRatio('Square')).toBeNull();
    expect(parseAspectRatio('0:1')).toBeNull();
  });
});

describe('roundHalfEven', () => {
  it("rounds halves to the even neighbour, like Python's round()", () => {
    expect(roundHalfEven(0.5)).toBe(0);
    expect(roundHalfEven(1.5)).toBe(2);
    expect(roundHalfEven(2.5)).toBe(2);
    expect(roundHalfEven(3.5)).toBe(4);
  });

  it('rounds everything else to nearest', () => {
    expect(roundHalfEven(2.49)).toBe(2);
    expect(roundHalfEven(2.51)).toBe(3);
    expect(roundHalfEven(170.67)).toBe(171);
  });
});

describe('resolutionFor', () => {
  it('matches ResolutionSelector for the defaults', () => {
    expect(resolutionFor('1:1 (Square)', 1, 8)).toEqual({ width: 1024, height: 1024 });
  });

  it('scales a widescreen ratio to the pixel budget on the multiple grid', () => {
    expect(resolutionFor('16:9 (Widescreen)', 1, 8)).toEqual({ width: 1368, height: 768 });
    expect(resolutionFor('9:16 (Portrait Widescreen)', 1, 8)).toEqual({ width: 768, height: 1368 });
  });

  it('snaps to a coarser multiple', () => {
    const size = resolutionFor('21:9 (Ultrawide)', 2, 64)!;
    expect(size.width % 64).toBe(0);
    expect(size.height % 64).toBe(0);
    expect(size).toEqual({ width: 2240, height: 960 });
  });

  it('returns null for inputs the node cannot use', () => {
    expect(resolutionFor('Square', 1, 8)).toBeNull();
    expect(resolutionFor('1:1 (Square)', 0, 8)).toBeNull();
    expect(resolutionFor('1:1 (Square)', 1, 0)).toBeNull();
    expect(resolutionFor('1:1 (Square)', NaN, 8)).toBeNull();
  });
});
