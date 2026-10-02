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
