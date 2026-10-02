import { describeSigmas, parseSigmas } from '@/features/comfy-node/utils/sigmas';

describe('parseSigmas', () => {
  it('reads every number regardless of separator', () => {
    expect(parseSigmas('1, 0.5')).toEqual([1, 0.5]);
    expect(parseSigmas('[1.0 0.75;0.5\n0]')).toEqual([1, 0.75, 0.5, 0]);
    expect(parseSigmas('.25, +3, -1')).toEqual([0.25, 3, -1]);
  });

  it('finds nothing in text without numbers', () => {
    expect(parseSigmas('')).toEqual([]);
    expect(parseSigmas('high, low')).toEqual([]);
  });
});

describe('describeSigmas', () => {
  it('counts sampling steps between sigmas', () => {
    expect(describeSigmas('1, 0.5, 0')).toEqual({ count: 3, steps: 2, valid: true });
  });

  it('flags a schedule too short to sample', () => {
    expect(describeSigmas('1')).toEqual({ count: 1, steps: 0, valid: false });
    expect(describeSigmas('')).toEqual({ count: 0, steps: 0, valid: false });
  });
});
