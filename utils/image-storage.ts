import { Workflow } from '@/types/workflow';
import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system';

interface SaveImageOptions {
  serverId: string;
  workflowId: string;
  imageUrl: string;
  workflow: Workflow;
  delete?: boolean;
}

export async function saveGeneratedImage({
  serverId,
  workflowId,
  imageUrl,
  workflow,
  delete: shouldDelete,
}: SaveImageOptions) {
  try {
    const dirPath = `${FileSystem.documentDirectory}server/${serverId}/workflows/${workflowId}/generated`;

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
      workflow,
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

export async function getGeneratedImages(serverId: string, workflowId: string) {
  try {
    const dirPath = `${FileSystem.documentDirectory}server/${serverId}/workflows/${workflowId}/generated`;

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
    console.error('failed to get generated images:', error);
    return [];
  }
}

export async function loadHistoryImages(serverId: string, workflowId: string) {
  try {
    const images = await getGeneratedImages(serverId, workflowId);

    return images
      .filter((image) => image.metadata)
      .map((image) => ({
        url: image.path,
        timestamp: new Date(image.metadata.timestamp).getTime(),
      }))
      .sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    console.error('failed to load history images:', error);
    return [];
  }
}

export async function saveWorkflowThumbnail({
  serverId,
  workflowId,
  imageUri,
  delete: shouldDelete,
  mimeType,
}: {
  serverId: string;
  workflowId: string;
  imageUri: string;
  delete?: boolean;
  mimeType?: string;
}) {
  try {
    const dirPath = `${FileSystem.documentDirectory}server/${serverId}/workflows/${workflowId}/thumbnail`;

    if (shouldDelete) {
      await FileSystem.deleteAsync(dirPath).catch(() => { });
      return;
    }

    // Create directory if it doesn't exist
    await FileSystem.makeDirectoryAsync(dirPath, { intermediates: true });

    // Clean up existing thumbnail files
    try {
      const files = await FileSystem.readDirectoryAsync(dirPath);
      await Promise.all(
        files.map((file) =>
          FileSystem.deleteAsync(`${dirPath}/${file}`).catch(() => { }),
        ),
      );
    } catch (error) {
      // Directory might not exist yet, which is fine
    }

    // Determine file extension
    let ext: string;
    if (mimeType) {
      // Get extension from MIME type
      switch (mimeType) {
        case 'image/jpeg':
          ext = 'jpg';
          break;
        case 'image/png':
          ext = 'png';
          break;
        case 'image/webp':
          ext = 'webp';
          break;
        case 'image/heic':
          ext = 'heic';
          break;
        default:
          ext = mimeType.split('/')[1] || 'jpg';
      }
    } else {
      // Try to get extension from uri, fallback to jpg
      ext = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
    }

    // Generate filename with determined extension
    const filename = `thumbnail.${ext}`;
    const filePath = `${dirPath}/${filename}`;

    // Copy image to permanent storage
    await FileSystem.copyAsync({
      from: imageUri,
      to: filePath,
    });

    // Verify the file exists
    const fileInfo = await FileSystem.getInfoAsync(filePath);
    if (!fileInfo.exists) {
      throw new Error('Failed to verify thumbnail file exists after saving');
    }

    return {
      path: filePath,
    };
  } catch (error) {
    console.error('failed to save/delete workflow thumbnail:', error);
    throw error;
  }
}

// Helper function to clean up server data
export async function cleanupServerData(serverId: string) {
  try {
    const serverDir = `${FileSystem.documentDirectory}server/${serverId}`;
    await FileSystem.deleteAsync(serverDir).catch(() => { });
  } catch (error) {
    console.error('failed to cleanup server data:', error);
  }
}

// Helper function to clean up workflow data
export async function cleanupWorkflowData(serverId: string, workflowId: string) {
  try {
    const workflowDir = `${FileSystem.documentDirectory}server/${serverId}/workflows/${workflowId}`;
    await FileSystem.deleteAsync(workflowDir).catch(() => { });
  } catch (error) {
    console.error('failed to cleanup workflow data:', error);
  }
} 