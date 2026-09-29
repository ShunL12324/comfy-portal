/**
 * Global polyfill for crypto.randomUUID on web in non-Secure Context (HTTP).
 *
 * crypto.randomUUID() is only available in Secure Contexts (HTTPS / localhost).
 * When the dev server is accessed via LAN IP (e.g. http://192.168.x.x), the
 * native API is missing. Third-party libraries (expo-crypto, expo-file-system,
 * uuid, etc.) may call crypto.randomUUID internally, so we patch it globally.
 *
 * This file is imported as a side-effect in app/_layout.tsx and MUST be loaded
 * before any library that depends on crypto.randomUUID.
 *
 * On native platforms this is a no-op.
 */
import { Platform } from 'react-native';

if (Platform.OS === 'web' && typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.randomUUID !== 'function') {
  globalThis.crypto.randomUUID = function randomUUID(): `${string}-${string}-${string}-${string}-${string}` {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    }) as `${string}-${string}-${string}-${string}-${string}`;
  };
}
