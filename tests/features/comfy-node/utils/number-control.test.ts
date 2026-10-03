import { numberControlFor, numberFieldFor, practicalStepFor } from '@/features/comfy-node/utils/number-control';

// Ranges as ComfyUI core and the common custom nodes declare them.
const UNIT = { kind: 'float', min: 0, max: 1, step: 0.01 } as const;
const HUGE_INT = { kind: 'int', min: 0, max: 0xffffffffffffffff } as const;
const RESOLUTION = { kind: 'int', min: 16, max: 16384, step: 8 } as const;

describe('numberControlFor', () => {
  it.each([
    ['denoise', UNIT],
    ['strength', UNIT],
    ['mask_opacity', UNIT],
    ['opacity', UNIT],
    ['feather', { kind: 'int', min: 0, max: 64, step: 1 }],
    ['blur_radius', { kind: 'int', min: 1, max: 31, step: 1 }],
    ['volume', { kind: 'float', min: 0, max: 2, step: 0.01 }],
    ['blend_factor', UNIT],
    ['zoom_step', { kind: 'float', min: 1, max: 4, step: 0.05 }],
  ] as const)('gives %s a slider', (name, spec) => {
    expect(numberControlFor(spec, name)).toBe('slider');
  });

  it.each([
    ['steps', { kind: 'int', min: 1, max: 10000 }],
    ['start_at_step', { kind: 'int', min: 0, max: 10000 }],
    ['cfg', { kind: 'float', min: 0, max: 100, step: 0.1 }],
    ['guidance', { kind: 'float', min: 0, max: 100, step: 0.1 }],
    ['seed', HUGE_INT],
    ['noise_seed', HUGE_INT],
    ['width', RESOLUTION],
    ['height', RESOLUTION],
    ['custom_width', { kind: 'int', min: 0, max: 8192, step: 8 }],
    ['batch_size', { kind: 'int', min: 1, max: 4096 }],
    ['length', { kind: 'int', min: 1, max: 16384, step: 4 }],
    ['frame_count', { kind: 'int', min: 0, max: 64 }],
    ['skip_first_frames', { kind: 'int', min: 0 }],
    ['select_every_nth', { kind: 'int', min: 1, max: 16 }],
    ['fps', { kind: 'float', min: 1, max: 240, step: 0.01 }],
    ['frame_rate', { kind: 'float', min: 1, max: 60, step: 1 }],
    ['shift', { kind: 'float', min: 0, max: 100, step: 0.01 }],
    ['shift_video', { kind: 'float', min: 0.01, max: 12, step: 0.01 }],
    ['megapixels', { kind: 'float', min: 0.01, max: 16, step: 0.01 }],
    ['crf', { kind: 'int', min: 0, max: 51 }],
    ['strength_model', { kind: 'float', min: -100, max: 100, step: 0.01 }],
    ['strength_clip', { kind: 'float', min: -100, max: 100, step: 0.01 }],
    ['start_time', { kind: 'float', min: 0, step: 0.001 }],
    ['scale_by', { kind: 'float', min: 0.01, max: 8, step: 0.01 }],
    ['resolution_steps', { kind: 'int', min: 1, max: 256 }],
  ] as const)('gives %s a stepper', (name, spec) => {
    expect(numberControlFor(spec, name)).toBe('stepper');
  });

  it('never narrows a feel value: an unbounded or huge range gets a stepper', () => {
    expect(numberControlFor({ kind: 'int', min: 0 }, 'feather')).toBe('stepper');
    expect(numberControlFor({ kind: 'int', min: 0, max: 4096 }, 'blur')).toBe('stepper');
    // A ControlNet-style 0–10 strength is a multiplier, not a 0–1 amount.
    expect(numberControlFor({ kind: 'float', min: 0, max: 10, step: 0.01 }, 'strength')).toBe('stepper');
  });

  it('reads the child name of a dynamic combo input', () => {
    expect(numberControlFor(UNIT, 'mode.denoise')).toBe('slider');
    expect(numberControlFor({ kind: 'int', min: 1, max: 64 }, 'mode.frame_count')).toBe('stepper');
  });

  describe('unknown names fall back to the range', () => {
    it('slides a 0–1 float whatever its step', () => {
      expect(numberControlFor({ kind: 'float', min: 0, max: 1, step: 0.0001 }, 'mystery')).toBe('slider');
    });

    it('slides short bounded ranges', () => {
      expect(numberControlFor({ kind: 'int', min: 0, max: 64 }, 'mystery')).toBe('slider');
      expect(numberControlFor({ kind: 'int', min: 0, max: 256 })).toBe('slider');
      expect(numberControlFor({ kind: 'float', min: -1, max: 2, step: 0.01 }, 'temperature')).toBe('slider');
    });

    it('steps through large or unbounded ranges', () => {
      expect(numberControlFor({ kind: 'int', min: 0 }, 'mystery')).toBe('stepper');
      expect(numberControlFor({ kind: 'int', min: 0, max: 1000 }, 'mystery')).toBe('stepper');
      expect(numberControlFor({ kind: 'int', min: -9223372036854775807, max: 9223372036854775807 })).toBe('stepper');
      expect(numberControlFor({ kind: 'float', min: 0.01, max: 100, step: 0.01 }, 'mystery')).toBe('stepper');
    });
  });
});

describe('practicalStepFor', () => {
  it('coarsens steppers whose server step is too fine to tap', () => {
    expect(practicalStepFor({ kind: 'float', min: 0, max: 100, step: 0.1 }, 'cfg', 'stepper')).toBe(0.5);
    expect(practicalStepFor({ kind: 'float', min: 0, max: 100, step: 0.01 }, 'shift', 'stepper')).toBe(0.5);
    expect(practicalStepFor({ kind: 'float', min: 0.01, max: 16, step: 0.01 }, 'megapixels', 'stepper')).toBe(0.1);
    expect(practicalStepFor({ kind: 'float', min: -100, max: 100, step: 0.01 }, 'strength_model', 'stepper')).toBe(
      0.05,
    );
    expect(practicalStepFor({ kind: 'float', min: 0, step: 0.001 }, 'start_time', 'stepper')).toBe(0.1);
  });

  it('keeps the server step for sliders, ints and coarser steps', () => {
    expect(practicalStepFor(UNIT, 'denoise', 'slider')).toBe(0.01);
    expect(practicalStepFor(RESOLUTION, 'width', 'stepper')).toBe(8);
    expect(practicalStepFor({ kind: 'float', min: 0, max: 100, step: 1 }, 'cfg', 'stepper')).toBe(1);
    expect(practicalStepFor({ kind: 'float', min: 0, max: 100, step: 0.01 }, 'mystery', 'stepper')).toBe(0.01);
  });
});

describe('numberFieldFor', () => {
  it('keeps a saved value outside the range as it is', () => {
    const steps = numberFieldFor({ kind: 'int', min: 1, max: 10000, step: 1 }, 'steps', 20000);
    expect(steps.value).toBe(20000);
    expect(steps.max).toBe(10000);
    expect(numberFieldFor(UNIT, 'denoise', 1.5).value).toBe(1.5);
  });

  it('reads older string values and falls back to the default', () => {
    expect(numberFieldFor({ kind: 'int', min: 1, max: 10000, default: 20 }, 'steps', '30').value).toBe(30);
    expect(numberFieldFor({ kind: 'int', min: 1, max: 10000, default: 20 }, 'steps', 'x').value).toBe(20);
  });

  it('types at the server precision while tapping by the practical step', () => {
    const cfg = numberFieldFor({ kind: 'float', min: 0, max: 100, step: 0.1 }, 'cfg', 7);
    expect(cfg).toMatchObject({ control: 'stepper', step: 0.5, decimalPlaces: 1, min: 0, max: 100 });
  });

  it('caps a stepper at the integers a JS number holds exactly', () => {
    const seed = numberFieldFor(HUGE_INT, 'seed', 1);
    expect(seed.max).toBe(Number.MAX_SAFE_INTEGER);
  });

  it('lets an editor override the control and step', () => {
    expect(numberFieldFor(UNIT, 'denoise', 1, { control: 'stepper', step: 0.1 })).toMatchObject({
      control: 'stepper',
      step: 0.1,
    });
  });
});
