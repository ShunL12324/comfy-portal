/**
 * Stream polyfills required by the AI SDK on React Native.
 *
 * Streaming goes through `expo/fetch`, but Hermes has no `TextEncoderStream` /
 * `TextDecoderStream`, which the SDK uses to decode the response body. The gap
 * only shows up on physical devices — simulators often have enough of the web
 * API surface to hide it — so this must be loaded unconditionally.
 *
 * Imported as a side-effect in app/_layout.tsx and MUST be loaded before any
 * AI SDK code runs. No-op on web, where the platform already provides these.
 */
import { Platform } from 'react-native';

if (Platform.OS !== 'web') {
  // Only patch what's actually missing, so a future RN release that ships
  // these natively silently takes over.
  if (typeof globalThis.ReadableStream === 'undefined') {
    const { ReadableStream, WritableStream, TransformStream } =
      require('web-streams-polyfill') as typeof import('web-streams-polyfill');
    Object.assign(globalThis, { ReadableStream, WritableStream, TransformStream });
  }

  if (typeof globalThis.TextEncoderStream === 'undefined') {
    const { TextEncoderStream, TextDecoderStream } =
      require('@stardazed/streams-text-encoding') as typeof import('@stardazed/streams-text-encoding');
    Object.assign(globalThis, { TextEncoderStream, TextDecoderStream });
  }
}
