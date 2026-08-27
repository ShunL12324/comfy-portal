import * as SecureStore from 'expo-secure-store';

/**
 * Key/value storage backed by the OS keychain.
 *
 * For secrets that can cost money if they leak — a vast.ai key can rent GPUs
 * on the user's account — rather than AsyncStorage, which is plaintext on disk
 * and rides along in device backups.
 *
 * Shaped as a zustand `StateStorage` so a store can persist straight into it.
 * SecureStore is a per-key store with a ~2KB practical value limit, so only put
 * credentials here; anything larger or non-secret belongs in AsyncStorage.
 */
export const secureStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      return await SecureStore.getItemAsync(name);
    } catch {
      // A corrupt or unreadable keychain entry shouldn't take the app down —
      // the caller sees "no credentials" and can re-enter them.
      return null;
    }
  },

  setItem: async (name: string, value: string): Promise<void> => {
    await SecureStore.setItemAsync(name, value);
  },

  removeItem: async (name: string): Promise<void> => {
    await SecureStore.deleteItemAsync(name);
  },
};

/** Whether the keychain is usable at all. False on web. */
export async function isSecureStorageAvailable(): Promise<boolean> {
  try {
    return await SecureStore.isAvailableAsync();
  } catch {
    return false;
  }
}
