import { Directory, File, Paths } from 'expo-file-system';

/**
 * Where a video's cached still frame lives (see `video-thumbnails`). Apart
 * from the player code that makes stills, so storage can delete them with
 * their videos.
 */
export const stillDirectory = () => new Directory(Paths.cache, 'video-thumbnails');

/** FNV-1a and djb2 side by side: 64 bits, so two videos practically never share a still. */
function hashPath(path: string): string {
  let fnv = 0x811c9dc5;
  let djb = 5381;
  for (let index = 0; index < path.length; index++) {
    const code = path.charCodeAt(index);
    fnv = Math.imul(fnv ^ code, 0x01000193);
    djb = (Math.imul(djb, 33) + code) | 0;
  }
  return (fnv >>> 0).toString(16).padStart(8, '0') + (djb >>> 0).toString(16).padStart(8, '0');
}

export function stillFile(videoUri: string): File {
  return new File(stillDirectory(), `${hashPath(videoUri)}.jpg`);
}

/** Deletes the stills of deleted videos. */
export function deleteVideoStills(videoUris: string[]) {
  for (const videoUri of videoUris) {
    try {
      const file = stillFile(videoUri);
      if (file.exists) file.delete();
    } catch {
      /* A stale still is harmless: a video's path is never reused. */
    }
  }
}
