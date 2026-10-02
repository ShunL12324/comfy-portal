/**
 * The web has no file cache to keep stills in, and a `<video>` element is a
 * cheap way to show a first frame there, so tiles keep their paused player.
 */
export function peekVideoStill(_key: string): string | null | undefined {
  return null;
}

export function subscribeVideoStills(_listener: () => void): () => void {
  return () => {};
}

export interface VideoStillOptions {
  key?: string;
  signal?: AbortSignal;
}

export async function requestVideoStill(
  _videoUri: string,
  _options?: VideoStillOptions,
): Promise<string | null | undefined> {
  return null;
}

export function forgetVideoStill(_key: string) {}
