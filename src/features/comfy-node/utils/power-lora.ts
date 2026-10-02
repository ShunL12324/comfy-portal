/**
 * rgthree's Power Lora Loader stores each row as an object input named
 * `lora_<n>`: `{ on, lora, strength, strengthTwo? }`. A numeric `strengthTwo`
 * splits the strength into model (`strength`) and clip (`strengthTwo`);
 * without it `strength` applies to both. See rgthree-comfy/py/power_lora_loader.py.
 */
export interface PowerLoraValue {
  on: boolean;
  lora: string | null;
  strength: number;
  strengthTwo?: number | null;
}

export interface PowerLoraEntry {
  key: string;
  value: PowerLoraValue;
}

const LORA_KEY = /^lora_(\d+)$/i;

export function isPowerLoraValue(value: unknown): value is PowerLoraValue {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    'on' in value &&
    'lora' in value &&
    'strength' in value
  );
}

const rowNumber = (key: string) => Number(LORA_KEY.exec(key)?.[1] ?? 0);

/** The rows in display order (`lora_2` before `lora_10`). */
export function powerLoraEntries(inputs: Record<string, unknown>): PowerLoraEntry[] {
  return Object.entries(inputs)
    .filter((entry): entry is [string, PowerLoraValue] => LORA_KEY.test(entry[0]) && isPowerLoraValue(entry[1]))
    .map(([key, value]) => ({ key, value }))
    .sort((a, b) => rowNumber(a.key) - rowNumber(b.key));
}

/** One past the highest row number in use, so a removed row's key isn't reused. */
export function nextPowerLoraKey(inputs: Record<string, unknown>): string {
  let max = 0;
  for (const [key, value] of Object.entries(inputs)) {
    if (LORA_KEY.test(key) && value !== undefined) max = Math.max(max, rowNumber(key));
  }
  return `lora_${max + 1}`;
}

/**
 * A new row, as rgthree's own UI makes one. `None` loads nothing until a LoRA
 * is picked: the server skips names it can't resolve.
 */
export function newPowerLoraValue(): PowerLoraValue {
  return { on: true, lora: 'None', strength: 1 };
}

/** Whether the row carries separate model and clip strengths. */
export function hasSeparateClipStrength(value: PowerLoraValue): boolean {
  return typeof value.strengthTwo === 'number';
}
