/**
 * Mirrors ComfyUI's `ResolutionSelector` (comfy_extras/nodes_resolution.py),
 * so the editor can show the size the node will actually output.
 */

/** Ratio from an option label such as `16:9 (Widescreen)`. */
export function parseAspectRatio(label: string): [number, number] | null {
  const match = /^\s*(\d+(?:\.\d+)?)\s*:\s*(\d+(?:\.\d+)?)/.exec(label);
  if (!match) return null;
  const w = Number(match[1]);
  const h = Number(match[2]);
  return w > 0 && h > 0 ? [w, h] : null;
}

/** Python's `round()`: halves go to the even neighbour, not up. */
export function roundHalfEven(value: number): number {
  const floor = Math.floor(value);
  if (Math.abs(value - floor - 0.5) > 1e-9) return Math.round(value);
  return floor % 2 === 0 ? floor : floor + 1;
}

export function resolutionFor(
  aspectRatio: string,
  megapixels: number,
  multiple: number,
): { width: number; height: number } | null {
  const ratio = parseAspectRatio(aspectRatio);
  if (!ratio || !(megapixels > 0) || !(multiple > 0)) return null;
  const [w, h] = ratio;
  const scale = Math.sqrt((megapixels * 1024 * 1024) / (w * h));
  return {
    width: roundHalfEven((w * scale) / multiple) * multiple,
    height: roundHalfEven((h * scale) / multiple) * multiple,
  };
}
