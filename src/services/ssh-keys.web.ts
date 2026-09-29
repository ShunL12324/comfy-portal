import type { SshKeyPair } from './ssh-keys';

/**
 * Web has no SSH.
 *
 * ssh-keys.ts reaches for react-native-quick-crypto, a Nitro native module
 * that has no browser build — importing it from a web bundle throws at module
 * scope and takes the whole app down before the first screen renders, which is
 * what happened here. A browser can't open a TCP socket to port 22 either, so
 * there is nothing to polyfill: the honest web build is one that fails loudly
 * at the call, not at the import.
 */
const UNSUPPORTED = 'SSH is not available in the browser — use the iOS or Android app to launch a cloud GPU.';

export type { SshKeyPair };

export async function ensureSshKeyPair(): Promise<SshKeyPair> {
  throw new Error(UNSUPPORTED);
}

export async function isSshKeyRegistered(_accountHash: string): Promise<boolean> {
  return false;
}

export async function markSshKeyRegistered(_accountHash: string): Promise<void> {
  throw new Error(UNSUPPORTED);
}
