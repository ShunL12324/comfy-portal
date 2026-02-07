import { Workflow } from '@/features/workflow/types';
import * as Crypto from 'expo-crypto';
import { Directory, File, Paths } from 'expo-file-system';

interface SaveMediaOptions {
  serverId: string;
  workflowId: string;
  mediaUrl: string;
  workflow: Workflow;
  delete?: boolean;
}

function getGeneratedDir(serverId: string, workflowId: string) {
  return new Directory(Paths.document, 'server', serverId, 'workflows', workflowId, 'generated');
}

function getThumbnailDir(serverId: string, workflowId: string) {
  return new Directory(Paths.document, 'server', serverId, 'workflows', workflowId, 'thumbnail');
}

function ensureDirectory(dir: Directory) {
  dir.create({ intermediates: true, idempotent: true });
}

export async function saveGeneratedMedia({
  serverId,
  workflowId,
  mediaUrl,
  workflow,
  delete: shouldDelete,
}: SaveMediaOptions) {
  try {
    const generatedDir = getGeneratedDir(serverId, workflowId);

    if (shouldDelete) {
      const filename = mediaUrl.split('/').pop()?.split('?')[0];
      if (!filename) throw new Error('Invalid media URL');

      new File(generatedDir, filename).delete();
      try {
        new File(generatedDir, `${filename}.json`).delete();
      } catch (error) {
        void error;
        // Ignore if metadata file doesn't exist
      }
      return;
    }

    ensureDirectory(generatedDir);

    const uuid = await Crypto.randomUUID();
    const timestamp = new Date().toISOString();
    const originalExt = mediaUrl.split('.').pop()?.split('?')[0] || 'png';
    const filename = `${timestamp}-${uuid}.${originalExt}`;

    const mediaFile = new File(generatedDir, filename);
    if (mediaUrl.startsWith('file://')) {
      new File(mediaUrl).copy(mediaFile);
    } else {
      await File.downloadFileAsync(mediaUrl, mediaFile, { idempotent: true });
    }

    const metadataFile = new File(generatedDir, `${filename}.json`);
    metadataFile.create({ intermediates: true, overwrite: true });

    const metadata = {
      timestamp,
      workflow,
      originalUrl: mediaUrl,
    };

    metadataFile.write(JSON.stringify(metadata, null, 2), { encoding: 'utf8' });

    return {
      path: mediaFile.uri,
      metadata,
    };
  } catch (error) {
    console.error('Failed to save/delete generated media:', error);
    throw error;
  }
}

export async function getGeneratedMedia(serverId: string, workflowId: string) {
  try {
    const generatedDir = getGeneratedDir(serverId, workflowId);
    const dirInfo = Paths.info(generatedDir.uri);

    if (!dirInfo.exists) {
      ensureDirectory(generatedDir);
    } else if (dirInfo.isDirectory === false) {
      new File(generatedDir.uri).delete();
      ensureDirectory(generatedDir);
    }

    const supportedExtensions = ['.png', '.jpg', '.jpeg', '.webp', '.mp4', '.gif', '.mov'];
    const mediaFiles = generatedDir
      .list()
      .filter((entry): entry is File => entry instanceof File)
      .filter((file) => supportedExtensions.some((ext) => file.name.toLowerCase().endsWith(ext)));

    return Promise.all(
      mediaFiles.map(async (file) => {
        const metadataFile = new File(generatedDir, `${file.name}.json`);
        try {
          const metadataStr = await metadataFile.text();
          const metadata = JSON.parse(metadataStr);
          return { path: file.uri, metadata };
        } catch (error) {
          void error;
          return { path: file.uri, metadata: null };
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
    const thumbnailDir = getThumbnailDir(serverId, workflowId);

    if (shouldDelete) {
      try {
        thumbnailDir.delete();
      } catch (error) {
        void error;
        // Ignore if directory doesn't exist
      }
      return;
    }

    ensureDirectory(thumbnailDir);

    // Keep only one thumbnail file.
    try {
      const files = thumbnailDir.list().filter((entry): entry is File => entry instanceof File);
      files.forEach((file) => {
        try {
          file.delete();
        } catch (error) {
          void error;
          // Ignore cleanup failures
        }
      });
    } catch (error) {
      void error;
      // Directory might not exist yet, which is fine
    }

    let ext: string;
    if (mimeType) {
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
      ext = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
    }

    const thumbnailFile = new File(thumbnailDir, `thumbnail.${ext}`);
    thumbnailFile.create({ intermediates: true, overwrite: true });
    new File(imageUri).copy(thumbnailFile);

    const fileInfo = thumbnailFile.info();
    if (!fileInfo.exists) {
      throw new Error('Failed to verify thumbnail file exists after saving');
    }

    return {
      path: thumbnailFile.uri,
    };
  } catch (error) {
    console.error('failed to save/delete workflow thumbnail:', error);
    throw error;
  }
}

export async function cleanupServerData(serverId: string) {
  try {
    const serverDir = new Directory(Paths.document, 'server', serverId);
    try {
      serverDir.delete();
    } catch (error) {
      void error;
      // Ignore if directory doesn't exist
    }
  } catch (error) {
    console.error('failed to cleanup server data:', error);
  }
}

export async function cleanupWorkflowData(serverId: string, workflowId: string) {
  try {
    const workflowDir = new Directory(Paths.document, 'server', serverId, 'workflows', workflowId);
    try {
      workflowDir.delete();
    } catch (error) {
      void error;
      // Ignore if directory doesn't exist
    }
  } catch (error) {
    console.error('failed to cleanup workflow data:', error);
  }
}
