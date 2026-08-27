import { Platform } from 'react-native';

/**
 * Whether cloud GPU management can work on this platform at all.
 *
 * False on web. vast.ai's API sends no CORS headers, so a browser refuses the
 * request before it leaves the page — there is no request to fix, and the only
 * ways around it are a proxy of our own (this app has no backend, by design)
 * or a third-party CORS relay (which would hand someone else a key that can
 * rent hardware). Native has no such restriction.
 *
 * Storing the keys on web would also be a downgrade: there is no keychain
 * there, so they would sit in localStorage and still be unusable.
 */
export const CLOUD_GPU_SUPPORTED = Platform.OS !== 'web';

export const CLOUD_GPU_UNSUPPORTED_REASON =
  "vast.ai's API can't be reached from a browser, so cloud GPU management is only available in the iOS and Android app.";
