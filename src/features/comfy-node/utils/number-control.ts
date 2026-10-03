import { NumberSpec, decimalPlacesFor, toNumber } from './schema-inputs';

export type NumberControl = 'slider' | 'stepper';

type RangeSpec = { min?: number; max?: number; step?: number; kind: string };

/**
 * The most positions a slider may have before a thumb can no longer land on
 * one by touch. Ints step by whole units, so far fewer of them fit.
 */
const MAX_SLIDER_STOPS = { int: 256, float: 2000 } as const;

/**
 * Exact values: counts, sizes, rates, durations, seeds, and values whose
 * declared range dwarfs the useful one (CFG 0–100 is used around 1–12).
 * These are typed or nudged, never dragged.
 */
const STEPPER_NAMES: RegExp[] = [
  /(^|_)steps$|_at_step$/, // steps, resolution_steps, start_at_step (not zoom_step, an increment)
  /^(cfg|guidance)(_|$)/,
  /seed$/, // seed, noise_seed
  /^(width|height)(_|$)|_(width|height)$|(^|_)side$/, // width, custom_width, image_max_side
  /^(batch_size|length|multiple|divisible_by)$|_multiple$/,
  /frame|(^|_)nth$|(^|_)count$/, // frame_rate, skip_first_frames, frame_load_cap, select_every_nth
  /^fps$|(^|_)rate$/, // fps, frame_rate, sample_rate
  /^shift|_shift$/, // shift, shift_video, max_shift
  /megapixels?$/,
  /^(crf|bitrate)$/,
  /^strength_(model|clip)$/,
  /^(seconds|duration|timeout)$|_(time|seconds)$/, // start_time
  /tokens$/,
  /^scale_by$/,
];

/** Amounts tuned by feel, where the thumb's position along the range means something. */
const SLIDER_NAMES: RegExp[] = [/^denoise$/, /opacity/, /feather/, /blur/, /^volume$/, /^blend/, /^mix$/, /strength$/];

/**
 * A `strength` beyond this span is a multiplier (ControlNet 0–10, LoRA
 * −100–100), not a 0–1 amount, so it gets a stepper.
 */
const MAX_SLIDER_STRENGTH_SPAN = 2;

/** Tap increments for steppers whose server step is too fine to reach anything by tapping. */
const PRACTICAL_STEPS: [RegExp, number][] = [
  [/^(cfg|guidance)(_|$)/, 0.5],
  [/^shift|_shift$/, 0.5],
  [/megapixels?$/, 0.1],
  [/^strength_(model|clip)$/, 0.05],
  [/^(seconds|duration)$|_(time|seconds)$/, 0.1],
  [/^fps$|^frame_rate$/, 1],
  [/^scale_by$/, 0.05],
];

/** Dynamic combo children are stored as `<combo>.<child>`; the child names the parameter. */
function parameterName(inputKey: string): string {
  return inputKey.slice(inputKey.lastIndexOf('.') + 1).toLowerCase();
}

function stepOf(spec: RangeSpec): number {
  return spec.step ?? (spec.kind === 'int' ? 1 : 0.01);
}

function isBounded(spec: RangeSpec): spec is RangeSpec & { min: number; max: number } {
  return spec.min !== undefined && spec.max !== undefined && Number.isFinite(spec.min) && Number.isFinite(spec.max);
}

function fitsSlider(spec: RangeSpec): boolean {
  if (!isBounded(spec)) return false;
  const limit = spec.kind === 'int' ? MAX_SLIDER_STOPS.int : MAX_SLIDER_STOPS.float;
  return (spec.max - spec.min) / stepOf(spec) <= limit;
}

/**
 * Slider or stepper for a numeric input, by what the parameter means first
 * and its declared range second.
 *
 * - Known exact values (`STEPPER_NAMES`: steps, CFG, seed, sizes, frames,
 *   fps, shift, megapixels, CRF, LoRA strengths, durations) get a stepper,
 *   whatever their range.
 * - Known feel values (`SLIDER_NAMES`: denoise, opacity, feather, blur,
 *   volume, a 0–2 strength) get a slider when the range is short enough to
 *   drag through, and a stepper when it isn't — never a narrowed slider.
 * - Anything else: a float within 0–1 is a slider; an unbounded input or an
 *   int with more than 256 positions (a float with more than 2000) is a
 *   stepper; a short bounded range is a slider.
 *
 * The range is always the server's (or the editor's fallback until it loads).
 * An editor's `control` prop still overrides this for a one-off.
 */
export function numberControlFor(spec: RangeSpec, inputKey = ''): NumberControl {
  const name = parameterName(inputKey);
  if (STEPPER_NAMES.some((pattern) => pattern.test(name))) return 'stepper';
  if (SLIDER_NAMES.some((pattern) => pattern.test(name))) {
    if (/strength$/.test(name) && isBounded(spec) && spec.max - spec.min > MAX_SLIDER_STRENGTH_SPAN) return 'stepper';
    return fitsSlider(spec) ? 'slider' : 'stepper';
  }
  if (!isBounded(spec)) return 'stepper';
  if (spec.kind === 'float' && spec.min >= 0 && spec.max <= 1) return 'slider';
  return fitsSlider(spec) ? 'slider' : 'stepper';
}

/**
 * The ± increment for a control. Sliders keep the server's step (it is their
 * grid). A stepper whose server step is finer than a useful tap (CFG's 0.1,
 * a time's 0.001) moves by `PRACTICAL_STEPS` instead; typing still accepts
 * anything at the server's precision.
 */
export function practicalStepFor(spec: RangeSpec, inputKey: string, control: NumberControl): number {
  const step = stepOf(spec);
  if (control === 'slider' || spec.kind === 'int') return step;
  const name = parameterName(inputKey);
  const practical = PRACTICAL_STEPS.find(([pattern]) => pattern.test(name))?.[1];
  return practical !== undefined && practical > step ? practical : step;
}

export interface NumberFieldShape {
  control: NumberControl;
  /** The workflow's value as saved, even outside the range: it is only clamped on edit. */
  value: number;
  min?: number;
  max?: number;
  step: number;
  /** From the server's step, so a typed value keeps the precision the server accepts. */
  decimalPlaces: number;
}

/** Everything a numeric field needs to render, from its spec, name and saved value. */
export function numberFieldFor(
  spec: NumberSpec,
  inputKey: string,
  value: unknown,
  overrides: { control?: NumberControl; step?: number } = {},
): NumberFieldShape {
  const control = overrides.control ?? numberControlFor(spec, inputKey);
  const stepper = control === 'stepper';
  return {
    control,
    value: toNumber(value, spec.default ?? spec.min ?? 0),
    // ComfyUI's INT bounds (±2^63) are past what a JS number holds exactly.
    min: stepper ? Math.max(spec.min ?? -Infinity, Number.MIN_SAFE_INTEGER) : spec.min,
    max: stepper ? Math.min(spec.max ?? Infinity, Number.MAX_SAFE_INTEGER) : spec.max,
    step: overrides.step ?? practicalStepFor(spec, inputKey, control),
    decimalPlaces: decimalPlacesFor(spec),
  };
}
