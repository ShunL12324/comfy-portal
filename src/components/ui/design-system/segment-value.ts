/**
 * Value resolution for the segmented controls in `native-controls.tsx`.
 *
 * Kept apart from the components so the node parameter contract can be tested
 * without pulling a renderer in, the same way the refresh cycle logic is split
 * from its artwork components.
 */

/**
 * An unrecognised value pins the first segment, matching how the design-system
 * track has always resolved a node parameter the server no longer offers.
 */
export function resolveSegmentIndex(options: string[], value: string) {
  return Math.max(0, options.indexOf(value));
}

/**
 * Resolves a segment tap to the option that should be committed, or
 * `undefined` when nothing should be written. Reading the index rather than the
 * emitted label matters because node enums such as the resolution presets can
 * repeat a display string.
 */
export function resolveSegmentChange(options: string[], value: string, index: number) {
  const next = options[index];
  return next === undefined || next === value ? undefined : next;
}
