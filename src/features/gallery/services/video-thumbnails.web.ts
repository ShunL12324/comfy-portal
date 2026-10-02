/**
 * The web has no file cache to keep stills in, and a `<video>` element is a
 * cheap way to show a first frame there, so tiles keep their paused player.
 */
export function peekVideoStill(_videoUri: string): string | null | undefined {
  return null;
}

export function subscribeVideoStills(_listener: () => void): () => void {
  return () => {};
}

export async function requestVideoStill(_videoUri: string): Promise<string | null> {
  return null;
}
