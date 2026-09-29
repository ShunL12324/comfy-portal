/** Joins the parts that exist into one spoken phrase: `Ready · 32 ms, 12 models`. Blank parts are skipped. */
export function spoken(...parts: (string | undefined | false)[]): string {
  return parts.filter((part): part is string => !!part && part.trim().length > 0).join(', ');
}
