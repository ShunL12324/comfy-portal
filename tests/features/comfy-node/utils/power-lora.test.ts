import {
  hasSeparateClipStrength,
  isPowerLoraValue,
  newPowerLoraValue,
  nextPowerLoraKey,
  patchPowerLoraValue,
  powerLoraEntries,
} from '@/features/comfy-node/utils/power-lora';

const row = (lora: string, strength = 1, on = true) => ({ on, lora, strength });

describe('powerLoraEntries', () => {
  it('keeps only lora rows, in numeric order', () => {
    const inputs = {
      PowerLoraLoaderHeaderWidget: { type: 'PowerLoraLoaderHeaderWidget' },
      lora_10: row('c.safetensors'),
      lora_2: row('b.safetensors'),
      lora_1: row('a.safetensors'),
      '➕ Add Lora': '',
      model: ['4', 0],
    };
    expect(powerLoraEntries(inputs).map((entry) => entry.key)).toEqual(['lora_1', 'lora_2', 'lora_10']);
  });

  it('skips removed rows and malformed values', () => {
    const inputs = { lora_1: undefined, lora_2: { on: true }, lora_3: row('a.safetensors') };
    expect(powerLoraEntries(inputs).map((entry) => entry.key)).toEqual(['lora_3']);
  });
});

describe('nextPowerLoraKey', () => {
  it('numbers past the highest row', () => {
    expect(nextPowerLoraKey({ lora_1: row('a'), lora_4: row('b') })).toBe('lora_5');
  });

  it('starts at one', () => {
    expect(nextPowerLoraKey({ model: ['4', 0] })).toBe('lora_1');
  });

  it('ignores cleared rows', () => {
    expect(nextPowerLoraKey({ lora_1: row('a'), lora_2: undefined })).toBe('lora_2');
  });
});

describe('row shape', () => {
  it('recognises rgthree row objects', () => {
    expect(isPowerLoraValue(row('a'))).toBe(true);
    expect(isPowerLoraValue({ type: 'PowerLoraLoaderHeaderWidget' })).toBe(false);
    expect(isPowerLoraValue(['4', 0])).toBe(false);
    expect(isPowerLoraValue(null)).toBe(false);
  });

  it('creates rows the server skips until a LoRA is picked', () => {
    expect(newPowerLoraValue()).toEqual({ on: true, lora: 'None', strength: 1 });
  });

  it('detects separate clip strength only when it is a number', () => {
    expect(hasSeparateClipStrength(row('a'))).toBe(false);
    expect(hasSeparateClipStrength({ ...row('a'), strengthTwo: null })).toBe(false);
    expect(hasSeparateClipStrength({ ...row('a'), strengthTwo: 0.5 })).toBe(true);
  });
});

describe('patchPowerLoraValue', () => {
  // As saved by rgthree, with a field this app doesn't model.
  const saved = { on: true, lora: 'a.safetensors', strength: 0.7, strengthTwo: 0.45, extra: { keep: 1 } };

  it('changes only the patched field and keeps the rest, in order', () => {
    const next = patchPowerLoraValue(saved, { strength: 0.75 });
    expect(next).toEqual({ ...saved, strength: 0.75 });
    expect(Object.keys(next)).toEqual(Object.keys(saved));
  });

  it('round-trips an unchanged row exactly and never mutates the original', () => {
    const before = JSON.stringify(saved);
    expect(JSON.stringify(patchPowerLoraValue(saved, {}))).toBe(before);
    patchPowerLoraValue(saved, { on: false, lora: 'b.safetensors' });
    expect(JSON.stringify(saved)).toBe(before);
  });

  it('writes clip strength without touching model strength', () => {
    expect(patchPowerLoraValue(saved, { strengthTwo: -0.2 })).toMatchObject({ strength: 0.7, strengthTwo: -0.2 });
  });
});
