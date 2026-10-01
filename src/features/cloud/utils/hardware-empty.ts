import type { CloudProvider } from '../types';

export type HardwareEmpty =
  /** No provider in view has an API key, so nothing could be asked. */
  | { reason: 'no-key'; providers: CloudProvider[] }
  /** A connected provider in view could not be queried. */
  | { reason: 'failed'; providers: CloudProvider[] }
  /** Every provider in view answered; nothing matches the filters or search. */
  | { reason: 'no-match' };

/** Why the hardware list is empty, so the screen never reports missing stock it never asked for. */
export function hardwareEmptyReason({
  filter,
  keys,
  unavailable,
}: {
  filter: 'all' | CloudProvider;
  keys: Record<CloudProvider, boolean>;
  unavailable: CloudProvider[];
}): HardwareEmpty {
  const inView: CloudProvider[] = filter === 'all' ? ['vast', 'runpod'] : [filter];
  const connected = inView.filter((provider) => keys[provider]);
  if (!connected.length) return { reason: 'no-key', providers: inView };
  const failed = connected.filter((provider) => unavailable.includes(provider));
  if (failed.length) return { reason: 'failed', providers: failed };
  return { reason: 'no-match' };
}
