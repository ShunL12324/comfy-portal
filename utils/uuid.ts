import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';

/**
 * Generate a UUID that works across all platforms.
 * On web without Secure Context (non-HTTPS), falls back to a manual implementation.
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
