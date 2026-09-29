export function uniqueCopyName(name: string, existing: readonly string[]): string {
  const names = new Set(existing.map((value) => value.toLocaleLowerCase()));
  const base = name.trim() || 'Untitled workflow';
  if (!names.has(base.toLocaleLowerCase())) return base;
  let index = 1;
  while (names.has((base + ' copy' + (index === 1 ? '' : ' ' + index)).toLocaleLowerCase())) index++;
  return base + ' copy' + (index === 1 ? '' : ' ' + index);
}
