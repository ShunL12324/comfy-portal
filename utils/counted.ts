/** A count with its unit word: `{ count: 1, label: 'model', text: '1 model' }`. The one place plurals are decided. */
export function counted(count: number, one: string, other: string): { count: number; label: string; text: string } {
  const label = count === 1 ? one : other;
  return { count, label, text: `${count} ${label}` };
}
