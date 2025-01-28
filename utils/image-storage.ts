import * as FileSystem from 'expo-file-system';
import * as Crypto from 'expo-crypto';
import { GenerationParams } from '@/types/generation';

interface SaveImageOptions {
  presetId: string;
  imageUrl: string;
  params: GenerationParams;
  delete?: boolean;
}

export async function saveGeneratedImage({
  presetId,
  imageUrl,
  params,
  delete: shouldDelete,
}: SaveImageOptions) {
  try {
    const dirPath = `${FileSystem.documentDirectory}presets/${presetId}/generated`;

    if (shouldDelete) {
      // Extract filename from path
      const filename = imageUrl.split('/').pop();
      if (!filename) throw new Error('Invalid image URL');

      // Delete image and metadata
      await FileSystem.deleteAsync(`${dirPath}/${filename}`);
      await FileSystem.deleteAsync(`${dirPath}/${filename}.json`).catch(() => { });
      return;
    }

    // Create directory if it doesn't exist
    await FileSystem.makeDirectoryAsync(dirPath, { intermediates: true });

    // Generate unique filename
    const uuid = await Crypto.randomUUID();
    const timestamp = new Date().toISOString();
    const filename = `${timestamp}-${uuid}.png`;

    // Download image
    const filePath = `${dirPath}/${filename}`;
    await FileSystem.downloadAsync(imageUrl, filePath);

    // Save metadata
    const metadataPath = `${dirPath}/${filename}.json`;
    const metadata = {
      timestamp,
      params,
      originalUrl: imageUrl,
    };
    await FileSystem.writeAsStringAsync(
      metadataPath,
      JSON.stringify(metadata, null, 2),
    );

    return {
      path: filePath,
      metadata,
    };
  } catch (error) {
    console.error('Failed to save/delete generated image:', error);
    throw error;
  }
}

export async function getGeneratedImages(presetId: string) {
  try {
    const dirPath = `${FileSystem.documentDirectory}presets/${presetId}/generated`;

    const fileInfo = await FileSystem.getInfoAsync(dirPath);
    if (!fileInfo.exists) {
      // create the directory
      await FileSystem.makeDirectoryAsync(dirPath, { intermediates: true });
    } else if (!fileInfo.isDirectory) {
      // delete the file then create the directory
      await FileSystem.deleteAsync(dirPath);
      await FileSystem.makeDirectoryAsync(dirPath, { intermediates: true });
    }

    const files = await FileSystem.readDirectoryAsync(dirPath);

    const images = files
      .filter((file) => file.endsWith('.png'))
      .map((file) => ({
        path: `${dirPath}/${file}`,
        metadataPath: `${dirPath}/${file}.json`,
      }));

    return Promise.all(
      images.map(async ({ path, metadataPath }) => {
        try {
          const metadataStr = await FileSystem.readAsStringAsync(metadataPath);
          const metadata = JSON.parse(metadataStr);
          return { path, metadata };
        } catch {
          return { path, metadata: null };
        }
      }),
    );
  } catch (error) {
    console.error('Failed to get generated images:', error);
    return [];
  }
}

export async function loadHistoryImages(presetId: string) {
  try {
    const images = await getGeneratedImages(presetId);

    return images
      .filter((image) => image.metadata) // Only include images with valid metadata
      .map((image) => ({
        url: image.path,
        timestamp: new Date(image.metadata.timestamp).getTime(),
      }))
      .sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    console.error('Failed to load history images:', error);
    return [];
  }
} 