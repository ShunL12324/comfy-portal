const VIDEO_EXTENSIONS = new Set(['mp4', 'mov', 'm4v', 'webm', 'mkv']);

export const GALLERY_MEDIA_EXTENSIONS = [
  'png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'tiff', ...VIDEO_EXTENSIONS,
];

export function mediaFilename(url: string): string {
  const [path, query] = url.split('?');
  const filename = path.endsWith('/view') && query
    ? new URLSearchParams(query).get('filename')
    : path.split('/').pop();
  return filename || 'media';
}

/** Whether a generated media URL points at a video rather than an image. */
export function isVideoUrl(url: string): boolean {
  const ext = mediaFilename(url).split('.').pop()?.toLowerCase() ?? '';
  return VIDEO_EXTENSIONS.has(ext);
}
