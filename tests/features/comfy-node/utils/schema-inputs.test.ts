import {
  comboOptions,
  decimalPlacesFor,
  dynamicComboUpdates,
  numberControlFor,
  pickFieldSpec,
  toNumber,
} from '@/features/comfy-node/utils/schema-inputs';
import { WidgetSpec } from '@/services/node-schema';

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

describe('numberControlFor', () => {
  it('uses a slider for short bounded ranges', () => {
    expect(numberControlFor({ kind: 'float', min: 0, max: 1, step: 0.01 })).toBe('slider');
    expect(numberControlFor({ kind: 'int', min: 0, max: 256 })).toBe('slider');
  });

  it('uses a stepper for open or huge ranges', () => {
    expect(numberControlFor({ kind: 'int', min: 0 })).toBe('stepper');
    expect(numberControlFor({ kind: 'int', min: -9223372036854775807, max: 9223372036854775807 })).toBe('stepper');
    expect(numberControlFor({ kind: 'float', min: 0.01, max: 100, step: 0.01 })).toBe('stepper');
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
