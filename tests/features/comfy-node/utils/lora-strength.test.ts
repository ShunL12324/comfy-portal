import {
  DEFAULT_LORA_STRENGTH,
  LORA_STRENGTH,
  loraStrengthLabel,
  loraStrengthValue,
} from '@/features/comfy-node/utils/lora-strength';

describe('loraStrengthValue', () => {
  it('passes numbers through, including negative and off-step weights', () => {
    expect(loraStrengthValue(0.8)).toBe(0.8);
    expect(loraStrengthValue(-0.35)).toBe(-0.35);
    expect(loraStrengthValue(0.725)).toBe(0.725);
    expect(loraStrengthValue(0)).toBe(0);
  });

  it('treats a link as read-only', () => {
    expect(loraStrengthValue(['4', 0])).toBeUndefined();
  });

  it('falls back to full strength for a missing or malformed value', () => {
    expect(loraStrengthValue(undefined)).toBe(DEFAULT_LORA_STRENGTH);
    expect(loraStrengthValue('1')).toBe(DEFAULT_LORA_STRENGTH);
    expect(loraStrengthValue(NaN)).toBe(DEFAULT_LORA_STRENGTH);
  });
});

describe('shared strength control', () => {
  it("uses core LoraLoader's range with rgthree's step", () => {
    expect(LORA_STRENGTH).toEqual({ min: -100, max: 100, step: 0.05, decimalPlaces: 2 });
  });

  it('labels a shared strength plainly and a model strength explicitly', () => {
    expect(loraStrengthLabel('shared')).toBe('Strength');
    expect(loraStrengthLabel('model')).toBe('Model Strength');
  });
});
