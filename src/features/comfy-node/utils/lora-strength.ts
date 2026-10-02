/**
 * One strength control for every LoRA editor. Core `LoraLoader` declares
 * -100..100 (step 0.01); rgthree's Power Lora Loader feeds the same loader and
 * steps its own widget by 0.05. The stepper takes rgthree's coarser nudge and
 * keeps two decimals, so a typed 0.73 survives.
 */
export const LORA_STRENGTH = { min: -100, max: 100, step: 0.05, decimalPlaces: 2 } as const;

/** Rows start at full strength, as both nodes do. */
export const DEFAULT_LORA_STRENGTH = 1;

/**
 * The editable number behind a strength input, or `undefined` when it is
 * linked to another node (`[nodeId, slot]`) and must not be overwritten.
 */
export function loraStrengthValue(value: unknown): number | undefined {
  if (Array.isArray(value)) return undefined;
  return typeof value === 'number' && Number.isFinite(value) ? value : DEFAULT_LORA_STRENGTH;
}

/**
 * Label for the first strength: a single shared strength reads plainly, a
 * model strength beside a clip strength (or alone, on a model-only loader)
 * says which it is.
 */
export function loraStrengthLabel(kind: 'shared' | 'model'): string {
  return kind === 'shared' ? 'Strength' : 'Model Strength';
}
