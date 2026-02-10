/**
 * Web version of image-storage.
 * On web, we don't have access to the native file system.
 * Generated media is displayed directly via URL, so most operations are no-ops.
 * History is stored in memory only (lost on page refresh).
 */

import { Workflow } from '@/features/workflow/types';
import { generateUUID } from '@/utils/uuid';

interface SaveMediaOptions {
  serverId: string;
  workflowId: string;
  mediaUrl: string;
  workflow: Workflow;
  delete?: boolean;
}

// In-memory storage for generated media on web
const memoryStore = new Map<string, Array<{ path: string; metadata: any }>>();

function getStoreKey(serverId: string, workflowId: string) {
  return `${serverId}:${workflowId}`;
}

export async function saveGeneratedMedia({
  serverId,
  workflowId,
  mediaUrl,
  workflow,
  delete: shouldDelete,
}: SaveMediaOptions) {
  try {
    const key = getStoreKey(serverId, workflowId);

    if (shouldDelete) {
      const items = memoryStore.get(key) || [];
      memoryStore.set(key, items.filter((item) => item.path !== mediaUrl));
      return;
    }

    const uuid = generateUUID();
    const timestamp = new Date().toISOString();

    const metadata = {
      timestamp,
      workflow,
      originalUrl: mediaUrl,
    };

    const items = memoryStore.get(key) || [];
    items.push({ path: mediaUrl, metadata });
    memoryStore.set(key, items);

    return {
      path: mediaUrl,
      metadata,
    };
  } catch (error) {
    console.error('Failed to save/delete generated media:', error);
    throw error;
  }
}

export async function getGeneratedMedia(serverId: string, workflowId: string) {
  try {
    const key = getStoreKey(serverId, workflowId);
    return memoryStore.get(key) || [];
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
  // On web, just return the URL as-is (no local file copy needed)
  if (shouldDelete) {
    return;
  }
  return {
    path: imageUri,
  };
}

export async function cleanupServerData(serverId: string) {
  // Clean up in-memory entries for this server
  for (const key of memoryStore.keys()) {
    if (key.startsWith(`${serverId}:`)) {
      memoryStore.delete(key);
    }
  }
}

export async function cleanupWorkflowData(serverId: string, workflowId: string) {
  const key = getStoreKey(serverId, workflowId);
  memoryStore.delete(key);
}
