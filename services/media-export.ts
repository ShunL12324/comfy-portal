import { mediaFilename } from '@/features/generation/utils/media';
import { generateUUID } from '@/utils/uuid';
import { File, Paths } from 'expo-file-system';

export async function withLocalMedia(url: string, action: (uri: string) => Promise<void>) {
  if (!/^https?:\/\//.test(url)) {
    await action(url);
    return;
  }
  const filename = mediaFilename(url).replace(/[^a-z0-9._-]/gi, '_');
  const file = new File(Paths.cache, `asset-${generateUUID()}-${filename}`);
  try {
    await File.downloadFileAsync(url, file);
    await action(file.uri);
  } finally {
    if (file.exists) file.delete();
  }
}

export async function downloadMediaOnWeb(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Download failed (HTTP ${response.status}).`);
  const objectUrl = URL.createObjectURL(await response.blob());
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = mediaFilename(url);
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}
