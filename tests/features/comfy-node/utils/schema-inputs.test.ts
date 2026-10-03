import {
  comboOptions,
  decimalPlacesFor,
  dynamicComboUpdates,
  isChangedFromDefault,
  optionWidgetUpdates,
  pairedNumberSpecs,
  pickFieldSpec,
  swappedPair,
  toNumber,
} from '@/features/comfy-node/utils/schema-inputs';
import { WidgetSpec } from '@/services/node-schema';

describe('isChangedFromDefault', () => {
  it('compares numbers within half a step', () => {
    const spec = { kind: 'float', default: 1.5, step: 0.05 } as const;
    expect(isChangedFromDefault(1.5, spec)).toBe(false);
    expect(isChangedFromDefault(1.5000001, spec)).toBe(false);
    expect(isChangedFromDefault(1.55, spec)).toBe(true);
    expect(isChangedFromDefault('1.5', spec)).toBe(false);
  });

  it('treats a combo without a default as defaulting to its first option', () => {
    const spec: WidgetSpec = { kind: 'combo', options: ['auto', 'low'] };
    expect(isChangedFromDefault('auto', spec)).toBe(false);
    expect(isChangedFromDefault('low', spec)).toBe(true);
  });

  it('compares booleans and strings', () => {
    expect(isChangedFromDefault(false, { kind: 'boolean', default: true })).toBe(true);
    expect(isChangedFromDefault(true, { kind: 'boolean', default: true })).toBe(false);
    expect(isChangedFromDefault('\n', { kind: 'string', multiline: false, default: '\n' })).toBe(false);
  });

  it('never counts linked, missing or default-less inputs', () => {
    expect(isChangedFromDefault(['4', 0], { kind: 'int', default: 1 })).toBe(false);
    expect(isChangedFromDefault(undefined, { kind: 'int', default: 1 })).toBe(false);
    expect(isChangedFromDefault(7, { kind: 'int' })).toBe(false);
  });
});

describe('optionWidgetUpdates', () => {
  const widgets: Record<string, Record<string, WidgetSpec>> = {
    'image/gif': {},
    'image/webp': { lossless: { kind: 'boolean', default: true } },
    'video/h264-mp4': {
      pix_fmt: { kind: 'combo', options: ['yuv420p', 'yuv420p10le'] },
      crf: { kind: 'int', min: 0, max: 100, default: 19 },
      trim_to_audio: { kind: 'boolean', default: false },
    },
    'video/webm': {
      pix_fmt: { kind: 'combo', options: ['yuv420p', 'yuva420p'] },
      crf: { kind: 'int', min: 0, max: 100, default: 20 },
    },
  };

  it('clears the old format widgets and adds the new one defaults', () => {
    const inputs = { format: 'video/h264-mp4', pix_fmt: 'yuv420p', crf: 19, trim_to_audio: true, frame_rate: 8 };
    expect(optionWidgetUpdates(inputs, 'format', 'image/webp', widgets)).toEqual({
      format: 'image/webp',
      pix_fmt: undefined,
      crf: undefined,
      trim_to_audio: undefined,
      lossless: true,
    });
  });

  it('keeps shared values the new format accepts and resets the rest', () => {
    const inputs = { format: 'video/h264-mp4', pix_fmt: 'yuv420p10le', crf: 30, trim_to_audio: false };
    expect(optionWidgetUpdates(inputs, 'format', 'video/webm', widgets)).toEqual({
      format: 'video/webm',
      pix_fmt: 'yuv420p',
      trim_to_audio: undefined,
    });
  });

  it('never touches linked widgets or the node own inputs', () => {
    const inputs = { format: 'video/h264-mp4', crf: ['7', 0], pix_fmt: 'yuv420p', trim_to_audio: true };
    expect(optionWidgetUpdates(inputs, 'format', 'image/gif', widgets, new Set(['trim_to_audio']))).toEqual({
      format: 'image/gif',
      pix_fmt: undefined,
    });
  });
});

describe('pairedNumberSpecs', () => {
  const fallback = { kind: 'int', min: 32, max: 16384, step: 32 } as const;

  it('shares one step between both sides', () => {
    const pair = pairedNumberSpecs(
      { value: 1280, spec: { kind: 'int', min: 32, max: 4096, step: 16 } },
      { value: '720', spec: undefined },
      fallback,
    );
    expect(pair).toMatchObject({ step: 32, decimalPlaces: 0, first: { value: 1280 }, second: { value: 720 } });
    expect(pair?.first.spec.max).toBe(4096);
    expect(pairedNumberSpecs({ value: 1, spec: undefined }, { value: 1, spec: undefined }, fallback, 8)?.step).toBe(8);
  });

  it('gives up when either side is linked, missing or not a number', () => {
    expect(
      pairedNumberSpecs({ value: ['3', 0], spec: undefined }, { value: 720, spec: undefined }, fallback),
    ).toBeNull();
    expect(
      pairedNumberSpecs({ value: 1280, spec: undefined }, { value: undefined, spec: undefined }, fallback),
    ).toBeNull();
    expect(
      pairedNumberSpecs(
        { value: 'a', spec: undefined },
        { value: 720, spec: undefined },
        { kind: 'string', multiline: false },
      ),
    ).toBeNull();
  });

  it('swaps within each side range', () => {
    const pair = pairedNumberSpecs(
      { value: 1280, spec: { kind: 'int', min: 32, max: 1024, step: 32 } },
      { value: 720, spec: undefined },
      fallback,
    );
    expect(pair && swappedPair(pair)).toEqual([720, 1280]);
    const tight = pairedNumberSpecs(
      { value: 512, spec: { kind: 'int', min: 32, max: 1024, step: 32 } },
      { value: 2048, spec: undefined },
      fallback,
    );
    expect(tight && swappedPair(tight)).toEqual([1024, 512]);
  });
});

describe('pickFieldSpec', () => {
  const fallback = { kind: 'float', min: 0, max: 1, step: 0.1 } as const;

  it('prefers the server spec of the same shape', () => {
    const server: WidgetSpec = { kind: 'float', min: 0, max: 2, step: 0.05 };
    expect(pickFieldSpec(server, fallback)).toBe(server);
  });

  it('treats int and float as the same shape', () => {
    const server: WidgetSpec = { kind: 'int', min: 0, max: 10 };
    expect(pickFieldSpec(server, fallback)).toBe(server);
  });

  it('falls back when the schema is missing, a socket, or a different widget', () => {
    expect(pickFieldSpec(undefined, fallback)).toBe(fallback);
    expect(pickFieldSpec({ kind: 'link' }, fallback)).toBe(fallback);
    expect(pickFieldSpec({ kind: 'combo', options: ['a'] }, { kind: 'string', multiline: false }).kind).toBe('string');
  });
});

describe('comboOptions', () => {
  it('labels options without changing their values', () => {
    expect(comboOptions(['join', 'separate_messages'], 'join', { join: 'Join' })).toEqual([
      { value: 'join', label: 'Join' },
      { value: 'separate_messages', label: 'separate_messages' },
    ]);
  });

  it('keeps an unknown current value selectable', () => {
    const options = comboOptions(['a', 'b'], 'c');
    expect(options).toHaveLength(3);
    expect(options[2]).toEqual({ value: 'c', label: 'c', description: 'Not offered by this server' });
  });

  it('adds nothing for empty or non-string values', () => {
    expect(comboOptions(['a'], '')).toHaveLength(1);
    expect(comboOptions(['a'], 3)).toHaveLength(1);
  });
});

describe('decimalPlacesFor', () => {
  it('follows the step for floats and is zero for ints', () => {
    expect(decimalPlacesFor({ kind: 'int', step: 0.5 })).toBe(0);
    expect(decimalPlacesFor({ kind: 'float', step: 0.05 })).toBe(2);
    expect(decimalPlacesFor({ kind: 'float', step: 1 })).toBe(0);
    expect(decimalPlacesFor({ kind: 'float' })).toBe(2);
  });
});

describe('toNumber', () => {
  it('accepts numbers and numeric strings', () => {
    expect(toNumber(3, 0)).toBe(3);
    expect(toNumber('1.5', 0)).toBe(1.5);
  });

  it('falls back for anything else', () => {
    expect(toNumber(['4', 0], 7)).toBe(7);
    expect(toNumber('abc', 7)).toBe(7);
    expect(toNumber(undefined, 7)).toBe(7);
  });
});

describe('dynamicComboUpdates', () => {
  const children: Record<string, Record<string, WidgetSpec>> = {
    combined: {
      crop_scale: { kind: 'float', default: 1.5 },
      aspect_ratio: { kind: 'float', default: 0 },
    },
    tracked: {
      crop_scale: { kind: 'float', default: 1.5 },
      padding: { kind: 'combo', options: ['guaranteed', 'firm'], default: 'firm' },
      prefer: { kind: 'combo', options: ['stillness', 'tightness'] },
      seamless_loop: { kind: 'boolean', default: false },
      source: { kind: 'link' },
    },
  };

  it('keeps shared children, defaults new ones and clears the rest', () => {
    const inputs = { mode: 'combined', 'mode.crop_scale': 2, 'mode.aspect_ratio': 1.78, divisible_by: 16 };
    expect(dynamicComboUpdates(inputs, 'mode', 'tracked', children)).toEqual({
      mode: 'tracked',
      'mode.aspect_ratio': undefined,
      'mode.padding': 'firm',
      'mode.prefer': 'stillness',
      'mode.seamless_loop': false,
    });
  });

  it('leaves unrelated inputs alone', () => {
    const updates = dynamicComboUpdates({ mode: 'tracked', 'model.x': 1 }, 'mode', 'combined', children);
    expect(updates).not.toHaveProperty('model.x');
    expect(updates).not.toHaveProperty('divisible_by');
  });

  it('only switches the combo when the option has no known children', () => {
    expect(dynamicComboUpdates({ mode: 'combined' }, 'mode', 'unknown', children)).toEqual({ mode: 'unknown' });
  });
});
