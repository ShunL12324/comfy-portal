/**
 * Polyfill for crypto.randomUUID on web in non-Secure Context (HTTP, not HTTPS).
 * crypto.randomUUID() is only available in Secure Contexts (HTTPS or localhost).
 * When accessed via LAN IP (e.g. http://192.168.x.x), it's not available.
 * This polyfill patches it globally so third-party libs (uuid, expo-file-system) work.
 */
import { Platform } from 'react-native';

if (Platform.OS === 'web' && typeof globalThis.crypto !== 'undefined') {
  if (typeof globalThis.crypto.randomUUID !== 'function') {
    globalThis.crypto.randomUUID = function randomUUID(): `${string}-${string}-${string}-${string}-${string}` {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      }) as `${string}-${string}-${string}-${string}-${string}`;
    };
  }
}
