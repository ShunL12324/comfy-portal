import type { UseIncomingShareResult } from 'expo-sharing';

const EMPTY: UseIncomingShareResult = {
  sharedPayloads: [],
  resolvedSharedPayloads: [],
  clearSharedPayloads: () => {},
  refreshSharePayloads: () => {},
  isResolving: false,
  error: null,
};

/**
 * There is no Share Extension on web, and expo-sharing's own hook throws
 * outright ("Receiving share payloads is not supported on web.") rather than
 * returning nothing. It's called unconditionally from the root layout — a hook
 * can't be called behind a Platform check — so the throw took down the whole
 * app before it rendered a single screen.
 */
export function useIncomingShare(): UseIncomingShareResult {
  return EMPTY;
}
