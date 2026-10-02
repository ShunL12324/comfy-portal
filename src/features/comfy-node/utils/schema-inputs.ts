import { WidgetSpec } from '@/services/node-schema';
import { sliderPrecision } from '@/components/self-ui/slider/slider-value';

/** A widget spec without the socket case: what a field can actually render. */
export type FieldSpec = Exclude<WidgetSpec, { kind: 'link' }>;

export interface ComboOption {
  value: string;
  label: string;
  description?: string;
}

/**
 * The live server spec when it describes the same kind of widget, otherwise
 * the editor's own fallback.
 *
 * The fallback keeps the field usable while the schema loads or when the
 * server can't be reached, and guards against an input the server now
 * declares as a socket (`forceInput`) — that one is wired, and SubItem says
 * so, but the control still needs a shape to render as.
 */
export function pickFieldSpec(server: WidgetSpec | undefined, fallback: FieldSpec): FieldSpec {
  if (!server || server.kind === 'link') return fallback;
  const numeric = (kind: WidgetSpec['kind']) => kind === 'int' || kind === 'float';
  if (server.kind === fallback.kind || (numeric(server.kind) && numeric(fallback.kind))) return server;
  return fallback;
}

/**
 * Combo options with the workflow's current value kept selectable, so a stale
 * workflow shows what is actually set instead of silently dropping it.
 */
export function comboOptions(options: string[], current: unknown, labels?: Record<string, string>): ComboOption[] {
  const list = options.map((value) => ({ value, label: labels?.[value] ?? value }));
  if (typeof current !== 'string' || !current || options.includes(current)) return list;
  return [...list, { value: current, label: labels?.[current] ?? current, description: 'Not offered by this server' }];
}

export type NumberControl = 'slider' | 'stepper';

/** The most slider positions a thumb can still place precisely on a phone. */
const MAX_SLIDER_STOPS = 2000;

/**
 * Sliders for short, bounded ranges; steppers for open-ended or huge ones
 * (ComfyUI's INT max is 2^63, which no slider can address).
 */
export function numberControlFor(spec: { min?: number; max?: number; step?: number; kind: string }): NumberControl {
  const { min, max } = spec;
  if (min === undefined || max === undefined || !Number.isFinite(min) || !Number.isFinite(max)) return 'stepper';
  const step = spec.step ?? (spec.kind === 'int' ? 1 : 0.01);
  return (max - min) / step <= MAX_SLIDER_STOPS ? 'slider' : 'stepper';
}

/** NumberInput rounds to its decimal places, so a float's must come from its step. */
export function decimalPlacesFor(spec: { kind: string; step?: number }): number {
  if (spec.kind === 'int') return 0;
  return sliderPrecision(spec.step ?? 0.01);
}

/** Workflows store numbers, but older exports occasionally carry them as strings. */
export function toNumber(value: unknown, fallback: number): number {
  const parsed = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * The input writes needed to switch a dynamic combo to another option.
 *
 * Each option carries its own child inputs, stored flat as `<combo>.<child>`.
 * Children the new option shares with the old one keep their values; new ones
 * get their defaults; ones the new option doesn't have are cleared (written as
 * `undefined`, which drops out of the prompt JSON) so the server never sees a
 * child that belongs to another option.
 */
export function dynamicComboUpdates(
  inputs: Record<string, unknown>,
  comboKey: string,
  nextOption: string,
  children: Record<string, Record<string, WidgetSpec>> | undefined,
): Record<string, unknown> {
  const updates: Record<string, unknown> = { [comboKey]: nextOption };
  const prefix = `${comboKey}.`;
  const nextChildren = children?.[nextOption] ?? {};

  for (const key of Object.keys(inputs)) {
    if (key.startsWith(prefix) && !(key.slice(prefix.length) in nextChildren) && inputs[key] !== undefined) {
      updates[key] = undefined;
    }
  }
  for (const [child, spec] of Object.entries(nextChildren)) {
    const key = prefix + child;
    if (inputs[key] !== undefined || spec.kind === 'link') continue;
    if (spec.default !== undefined) updates[key] = spec.default;
    else if (spec.kind === 'combo' && spec.options.length > 0) updates[key] = spec.options[0];
  }
  return updates;
}

type NumberSpec = Extract<FieldSpec, { kind: 'int' | 'float' }>;

export interface PairedNumbers {
  first: { value: number; spec: NumberSpec };
  second: { value: number; spec: NumberSpec };
  step: number;
  decimalPlaces: number;
}

/**
 * The shared shape of two numbers edited as one row (Width × Height), or
 * `null` when they can't share one: either is missing or linked, or isn't a
 * number. Both step by the coarser of the two increments, so a tap moves
 * each by the same amount.
 */
export function pairedNumberSpecs(
  first: { value: unknown; spec: WidgetSpec | undefined },
  second: { value: unknown; spec: WidgetSpec | undefined },
  fallback: FieldSpec,
  stepOverride?: number,
): PairedNumbers | null {
  const sides = [first, second].map(({ value, spec }) => {
    if (value === undefined || Array.isArray(value)) return null;
    const picked = pickFieldSpec(spec, fallback);
    if (picked.kind !== 'int' && picked.kind !== 'float') return null;
    return { value: toNumber(value, picked.default ?? picked.min ?? 0), spec: picked };
  });
  const [a, b] = sides;
  if (!a || !b) return null;
  const stepOf = (spec: NumberSpec) => spec.step ?? (spec.kind === 'int' ? 1 : 0.01);
  const specStep = Math.max(stepOf(a.spec), stepOf(b.spec));
  const kind = a.spec.kind === 'float' || b.spec.kind === 'float' ? 'float' : 'int';
  return {
    first: a,
    second: b,
    step: stepOverride ?? specStep,
    decimalPlaces: decimalPlacesFor({ kind, step: Math.min(stepOf(a.spec), stepOf(b.spec)) }),
  };
}

/** The pair's values exchanged, each kept within the other's range. */
export function swappedPair({ first, second }: PairedNumbers): [number, number] {
  const clamp = (value: number, spec: NumberSpec) =>
    Math.min(spec.max ?? Infinity, Math.max(spec.min ?? -Infinity, value));
  return [clamp(second.value, first.spec), clamp(first.value, second.spec)];
}

/**
 * What the server falls back to for an input: its declared default, or for a
 * combo without one, the first option (as ComfyUI's own widgets do).
 */
export function defaultValueOf(spec: FieldSpec): unknown {
  if (spec.default !== undefined) return spec.default;
  return spec.kind === 'combo' ? spec.options[0] : undefined;
}

/**
 * Whether a set value differs from the input's default, so a collapsed
 * section can say how many of its settings were touched. Linked and missing
 * inputs, and ones without a known default, never count.
 */
export function isChangedFromDefault(value: unknown, spec: FieldSpec): boolean {
  if (value === undefined || Array.isArray(value)) return false;
  const fallback = defaultValueOf(spec);
  if (fallback === undefined) return false;
  switch (spec.kind) {
    case 'int':
    case 'float': {
      const current = toNumber(value, NaN);
      const base = toNumber(fallback, NaN);
      if (!Number.isFinite(current) || !Number.isFinite(base)) return false;
      // Within half a step is the same value written with float noise.
      return Math.abs(current - base) > (spec.step ?? (spec.kind === 'int' ? 1 : 0.01)) / 2;
    }
    case 'boolean':
      return (value === true || value === 1) !== (fallback === true || fallback === 1);
    default:
      return String(value ?? '') !== String(fallback ?? '');
  }
}

/** Whether `value` is something `spec` accepts, so a switch can keep it. */
function fitsSpec(value: unknown, spec: FieldSpec): boolean {
  switch (spec.kind) {
    case 'combo':
      return typeof value === 'string' && spec.options.includes(value);
    case 'int':
    case 'float': {
      const n = toNumber(value, NaN);
      return Number.isFinite(n) && n >= (spec.min ?? -Infinity) && n <= (spec.max ?? Infinity);
    }
    case 'boolean':
      return typeof value === 'boolean';
    case 'string':
      return typeof value === 'string';
  }
}

/** A starting value for a widget the workflow doesn't carry yet. */
function initialValueOf(spec: FieldSpec): unknown {
  const fallback = defaultValueOf(spec);
  if (fallback !== undefined) return fallback;
  if (spec.kind === 'boolean') return false;
  if (spec.kind === 'string') return '';
  if (spec.kind === 'int' || spec.kind === 'float') return spec.min ?? 0;
  return undefined;
}

/**
 * The input writes needed to switch a combo whose options bring their own
 * top-level widgets (VHS Video Combine's `format`).
 *
 * Mirrors the desktop UI, which swaps the old option's widgets for the new
 * one's: widgets only other options have are cleared, and new ones get their
 * defaults. A widget both share keeps the workflow's value when the new
 * option accepts it (an h264 CRF of 19 is a fine webm CRF; `yuv420p10le` is
 * not a webm pixel format). Linked widgets and the node's own inputs are
 * never touched.
 */
export function optionWidgetUpdates(
  inputs: Record<string, unknown>,
  comboKey: string,
  nextOption: string,
  widgets: Record<string, Record<string, WidgetSpec>> | undefined,
  ownInputs: ReadonlySet<string> = new Set(),
): Record<string, unknown> {
  const updates: Record<string, unknown> = { [comboKey]: nextOption };
  const next = widgets?.[nextOption] ?? {};
  const known = new Set(Object.values(widgets ?? {}).flatMap((specs) => Object.keys(specs)));

  for (const key of known) {
    if (key in next || ownInputs.has(key) || key === comboKey) continue;
    if (inputs[key] !== undefined && !Array.isArray(inputs[key])) updates[key] = undefined;
  }
  for (const [key, spec] of Object.entries(next)) {
    const current = inputs[key];
    if (spec.kind === 'link' || Array.isArray(current)) continue;
    if (current !== undefined && fitsSpec(current, spec)) continue;
    const initial = initialValueOf(spec);
    if (initial !== undefined) updates[key] = initial;
  }
  return updates;
}
