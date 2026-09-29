/**
 * Web has no keychain.
 *
 * expo-secure-store simply isn't implemented for the browser, so this falls
 * back to localStorage to keep the app working there. That is genuinely less
 * safe — anything running in the page can read it — which is why callers
 * should surface the difference rather than pretend it's equivalent; see
 * `isSecureStorageAvailable`, which returns false here.
 */
export const secureStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      return globalThis.localStorage?.getItem(name) ?? null;
    } catch {
      return null;
    }
  },

  setItem: async (name: string, value: string): Promise<void> => {
    globalThis.localStorage?.setItem(name, value);
  },

  removeItem: async (name: string): Promise<void> => {
    globalThis.localStorage?.removeItem(name);
  },
};

export async function isSecureStorageAvailable(): Promise<boolean> {
  return false;
}
