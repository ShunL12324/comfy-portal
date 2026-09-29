import { useMediaStore, waitForMediaHydration, mediaStorage, mediaKind } from '@/features/gallery/stores/media-store';
import { Workflow } from '@/features/workflow/types';
import { useWorkflowStore } from '@/features/workflow/stores/workflow-store';
import { resolveProvenance } from '@/services/media-provenance';
import { generateUUID } from '@/utils/uuid';
import { Directory, File, Paths } from 'expo-file-system';

interface SaveMediaOptions {
  serverId: string;
  workflowId: string;
  mediaUrl: string;
  workflow: Workflow;
  delete?: boolean;
  /**
   * Prompt that produced this media. Recorded so recovery can tell whether a
   * job's outputs are already on disk and avoid saving them twice.
   */
  promptId?: string;
  sourceId?: string;
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
  promptId,
  sourceId,
}: SaveMediaOptions) {
  await waitForMediaHydration();
  const store = useMediaStore.getState();
  if (shouldDelete) {
    const asset = store.assets.find((item) => item.path === mediaUrl);
    if (!asset) return;
    const file = new File(asset.path);
    if (file.exists) file.delete();
    store.remove(asset.path);
    return;
  }
  const existing =
    promptId &&
    store.assets.find(
      (item) =>
        item.serverId === serverId &&
        item.metadata.promptId === promptId &&
        (sourceId ? item.metadata.sourceId === sourceId : item.metadata.originalUrl === mediaUrl),
    );
  if (existing) {
    store.upsert(existing);
    await mediaStorage.flush();
    return { path: existing.path, metadata: existing.metadata };
  }

  const directory = new Directory(Paths.document, 'media-v2');
  ensureDirectory(directory);
  const id = generateUUID();
  const parsed = new URL(mediaUrl);
  const sourceName = parsed.searchParams.get('filename') ?? parsed.pathname;
  const extension = sourceName.match(/\.(png|jpe?g|webp|gif|mp4|mov|webm|m4v)$/i)?.[1]?.toLowerCase() ?? 'png';
  const destination = new File(directory, id + '.' + extension);
  if (mediaUrl.startsWith('file://')) await new File(mediaUrl).copy(destination);
  else await File.downloadFileAsync(mediaUrl, destination, { idempotent: true });
  const metadata = {
    timestamp: new Date().toISOString(),
    workflow: JSON.parse(JSON.stringify(workflow)),
    originalUrl: sourceId ?? mediaUrl,
    ...(sourceId ? { sourceId } : {}),
    ...(promptId ? { promptId } : {}),
    producedBy: resolveProvenance(serverId, workflowId),
  };
  store.upsert({ id, serverId, workflowId, kind: mediaKind(destination.uri), path: destination.uri, metadata });
  await mediaStorage.flush();
  if (mediaUrl.startsWith(new Directory(Paths.cache, 'comfy-downloads').uri.replace(/\/?$/, '/'))) {
    const downloaded = new File(mediaUrl);
    if (downloaded.exists) downloaded.delete();
  }
  return { path: destination.uri, metadata };
}

export async function getGeneratedMedia(serverId: string, workflowId: string) {
  await waitForMediaHydration();
  await mediaStorage.flush();
  return useMediaStore.getState().assets.filter((item) => item.serverId === serverId && item.workflowId === workflowId);
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
    // Thumbnails belong to reusable assets, never to a removable connection.
    const thumbnailDir = new Directory(Paths.document, 'workflow-thumbnails-v2');
    if (shouldDelete) {
      const referenced = useWorkflowStore.getState().assets.some((asset) => asset.thumbnail === imageUri);
      if (!referenced && imageUri.startsWith(thumbnailDir.uri.replace(/\/?$/, '/'))) {
        const file = new File(imageUri);
        if (file.exists) file.delete();
      }
      return;
    }
    ensureDirectory(thumbnailDir);

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

    const thumbnailFile = new File(thumbnailDir, generateUUID() + '.' + ext);
    await new File(imageUri).copy(thumbnailFile);

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

/**
 * Removing a connection does not delete independent gallery assets.
 *
 * This used to delete `server/<id>/` whole, which destroyed every generated
 * image and video underneath it. Media is a pool now: it records which machine
 * and workflow produced it and outlives both. Deliberately still here, and
 * deliberately empty — it is the name someone reaches for when they next wire
 * up server removal, and finding it doing nothing on purpose is the point. Do
 * not give it back a deleting body, and do not add a new cleanup keyed on
 * serverId or workflowId. The same prohibition is on `MediaAsset` itself.
 *
 * Its per-workflow twin was removed: nothing had called it since the pool
 * landed, and one carrier for the rule is enough.
 */
export async function cleanupServerData(_serverId: string) {}
