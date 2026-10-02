import { useCallback, useEffect, useSyncExternalStore } from 'react';

import { peekVideoStill, requestVideoStill, subscribeVideoStills } from '../services/video-thumbnails';

/**
 * The cached still frame of a video (see `services/video-thumbnails`), asking
 * for one to be made when there is none. `undefined` while it is being made,
 * `null` when it cannot be; pass no URI for media that is not a video.
 */
export function useVideoStill(videoUri: string | undefined): string | null | undefined {
  const read = useCallback(() => (videoUri ? peekVideoStill(videoUri) : undefined), [videoUri]);
  const still = useSyncExternalStore(subscribeVideoStills, read, read);
  useEffect(() => {
    if (videoUri && still === undefined) void requestVideoStill(videoUri);
  }, [videoUri, still]);
  return still;
}
