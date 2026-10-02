/**
 * Maps `items` through `fn`, running at most `limit` calls at once, and
 * returns one promise per item in input order.
 *
 * Items start in order as earlier ones settle, so a caller can consume the
 * results in order (for example, to commit them in a stable sequence) while
 * later items are already in flight.
 */
export function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R>[] {
  const starts: (() => void)[] = [];
  const results = items.map((item, index) =>
    new Promise<void>((start) => (starts[index] = start)).then(() => fn(item, index)),
  );
  let next = 0;
  const launch = () => {
    if (next < starts.length) starts[next++]();
  };
  results.forEach((result) => result.then(launch, launch));
  for (let i = 0; i < Math.max(1, limit); i++) launch();
  return results;
}
