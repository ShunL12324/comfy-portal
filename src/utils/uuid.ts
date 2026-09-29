import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';

/**
 * Unified cross-platform UUID generator.
 *
 * This is the ONLY function app code should use to create UUIDs.
 * On native it delegates to expo-crypto; on web it falls back to a manual
 * implementation when crypto.randomUUID is unavailable (non-Secure Context).
 *
 * NOTE: Third-party libraries may call crypto.randomUUID directly.
 * The global polyfill in shims/crypto-random-uuid.web.ts covers that case.
 */
export function generateUUID(): string {
  try {
    return Crypto.randomUUID();
  } catch {
    // Fallback for web without Secure Context (e.g. non-HTTPS)
    if (Platform.OS === 'web') {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    }
    throw new Error('randomUUID is not available');
  }
}
