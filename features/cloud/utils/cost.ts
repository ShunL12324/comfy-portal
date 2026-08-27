/** Formats an elapsed duration as `3h 12m`, or `12m` under an hour. */
export function formatUptime(startedAtSeconds: number, nowMs = Date.now()): string {
  const totalMinutes = Math.max(0, Math.floor((nowMs / 1000 - startedAtSeconds) / 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

/**
 * What the instance has cost so far.
 *
 * Shown wherever a running instance is, not hidden behind a tap: the whole
 * failure mode this guards against is forgetting a machine is on.
 */
export function accruedCost(
  startedAtSeconds: number,
  pricePerHour: number,
  nowMs = Date.now(),
): number {
  const hours = Math.max(0, nowMs / 1000 - startedAtSeconds) / 3600;
  return hours * pricePerHour;
}

export function formatUsd(amount: number): string {
  return amount < 0.01 ? '<$0.01' : `$${amount.toFixed(2)}`;
}
