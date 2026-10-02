/**
 * Parse `ManualSigmas` text the way the node does: every number in the string,
 * whatever separates them (comfy_extras/nodes_custom_sampler.py uses
 * `re.findall(r"[-+]?(?:\d*\.*\d+)", sigmas)`).
 */
export function parseSigmas(text: string): number[] {
  return (text.match(/[-+]?(?:\d*\.*\d+)/g) ?? []).map(Number).filter(Number.isFinite);
}

/** Sampling needs a start and an end sigma; anything less runs zero steps. */
export function describeSigmas(text: string): { count: number; steps: number; valid: boolean } {
  const count = parseSigmas(text).length;
  return { count, steps: Math.max(0, count - 1), valid: count >= 2 };
}
