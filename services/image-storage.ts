import { Workflow } from '@/features/workflow/types';
import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system';

interface SaveMediaOptions {
  serverId: string;
  workflowId: string;
  mediaUrl: string;
  workflow: Workflow;
  delete?: boolean;
}

export async function saveGeneratedMedia({
  serverId,
  workflowId,
  mediaUrl,
  workflow,
  delete: shouldDelete,
}: SaveMediaOptions) {
  try {
    const dirPath = `${FileSystem.documentDirectory}server/${serverId}/workflows/${workflowId}/generated`;

    if (shouldDelete) {
      // Extract filename from path
      const filename = mediaUrl.split('/').pop();
      if (!filename) throw new Error('Invalid media URL');

      // Delete media and metadata
      await FileSystem.deleteAsync(`${dirPath}/${filename}`);
      await FileSystem.deleteAsync(`${dirPath}/${filename}.json`).catch(() => { });
      return;
    }

    // Create directory if it doesn't exist
    await FileSystem.makeDirectoryAsync(dirPath, { intermediates: true });

    // Generate unique filename
    const uuid = await Crypto.randomUUID();
    const timestamp = new Date().toISOString();
    
    // Get extension from original URL or default to png
    const originalExt = mediaUrl.split('.').pop()?.split('?')[0] || 'png';
    const filename = `${timestamp}-${uuid}.${originalExt}`;

    // Download media
    const filePath = `${dirPath}/${filename}`;
    await FileSystem.downloadAsync(mediaUrl, filePath);

    // Save metadata
    const metadataPath = `${dirPath}/${filename}.json`;
    const metadata = {
      timestamp,
      workflow,
      originalUrl: mediaUrl,
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
    console.error('Failed to save/delete generated media:', error);
    throw error;
  }
}

export async function getGeneratedMedia(serverId: string, workflowId: string) {
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

    const supportedExtensions = ['.png', '.jpg', '.jpeg', '.webp', '.mp4', '.gif', '.mov'];
    const mediaItems = files
      .filter((file) => supportedExtensions.some(ext => file.toLowerCase().endsWith(ext)))
      .map((file) => ({
        path: `${dirPath}/${file}`,
        metadataPath: `${dirPath}/${file}.json`,
      }));

    return Promise.all(
      mediaItems.map(async ({ path, metadataPath }) => {
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
    console.error('failed to get generated media:', error);
    return [];
  }
}

export async function loadHistoryMedia(serverId: string, workflowId: string) {
  try {
    const mediaItems = await getGeneratedMedia(serverId, workflowId);

    return mediaItems
      .filter((item) => item.metadata)
      .map((item) => ({
        url: item.path,
        timestamp: new Date(item.metadata.timestamp).getTime(),
      }))
      .sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    console.error('failed to load history media:', error);
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