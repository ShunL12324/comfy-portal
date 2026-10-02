import { useCallback, useEffect, useSyncExternalStore } from 'react';

import { peekVideoStill, requestVideoStill, subscribeVideoStills } from '../services/video-thumbnails';

/**
 * The cached still frame of a video (see `services/video-thumbnails`), asking
 * for one to be made when there is none. `undefined` while it is being made,
 * `null` when it cannot be; pass no URI for media that is not a video. `key`
 * caches it under another identity than the URI. Unmounting before its turn
 * gives the request up.
 */
export function useVideoStill(videoUri: string | undefined, key?: string): string | null | undefined {
  const cacheKey = key ?? videoUri;
  const read = useCallback(() => (cacheKey ? peekVideoStill(cacheKey) : undefined), [cacheKey]);
  const still = useSyncExternalStore(subscribeVideoStills, read, read);
  useEffect(() => {
    if (!videoUri || still !== undefined) return;
    const controller = new AbortController();
    void requestVideoStill(videoUri, { key: cacheKey, signal: controller.signal });
    return () => controller.abort();
  }, [videoUri, cacheKey, still]);
  return still;
}
