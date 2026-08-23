const VIDEO_EXTENSIONS = new Set(['mp4', 'mov', 'm4v', 'webm']);

/** Whether a generated media URL points at a video rather than an image. */
export function isVideoUrl(url: string): boolean {
  const ext = url.split('.').pop()?.toLowerCase() ?? '';
  return VIDEO_EXTENSIONS.has(ext);
}
