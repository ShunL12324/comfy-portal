import { useMediaStore, waitForMediaHydration, mediaStorage, mediaKind } from '@/features/gallery/stores/media-store';
import { Workflow } from '@/features/workflow/types';
import { useWorkflowStore } from '@/features/workflow/stores/workflow-store';
import { mediaTime } from '@/features/gallery/utils/media-time';
import { resolveProvenance } from '@/services/media-provenance';
import { generateUUID } from '@/utils/uuid';
import { deleteVideoStills } from '@/features/gallery/services/video-still-file';
import { Directory, File, Paths } from 'expo-file-system';

interface SaveMediaOptions {
  serverId: string;
  workflowId: string;
  mediaUrl: string;
  workflow: Workflow;
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
  promptId,
  sourceId,
}: SaveMediaOptions) {
  await waitForMediaHydration();
  const store = useMediaStore.getState();
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

/** Deletes outputs: each file and its gallery entry, then persists the index. */
export async function deleteGeneratedMedia(paths: string[]) {
  await waitForMediaHydration();
  const store = useMediaStore.getState();
  for (const path of paths) {
    try {
      const file = new File(path);
      if (file.exists) file.delete();
    } catch {
      // A file that cannot be deleted must still leave the gallery.
    }
  }
  deleteVideoStills(paths);
  // Each store update re-renders the grid and rewrites the whole persisted
  // index, workflows included, so a batch leaves in one.
  store.removeMany(paths);
  await mediaStorage.flush();
}

/**
 * Drops gallery entries whose file is gone. Files are always written before
 * their entry, so a missing file is never a download in progress; it is debris,
 * such as the entries History left behind when it deleted only the files.
 */
export async function pruneMissingMedia() {
  await waitForMediaHydration();
  const store = useMediaStore.getState();
  const missing = store.assets.filter((asset) => {
    try {
      return !new File(asset.path).exists;
    } catch {
      return false;
    }
  });
  if (!missing.length) return;
  store.removeMany(missing.map((asset) => asset.path));
  await mediaStorage.flush();
}

export async function getGeneratedMedia(serverId: string, workflowId: string) {
  await pruneMissingMedia();
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
        timestamp: mediaTime(item.metadata.timestamp) ?? 0,
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
