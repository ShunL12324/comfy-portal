import { useMediaStore, waitForMediaHydration, mediaStorage, mediaKind } from '@/features/gallery/stores/media-store';
import type { MediaAsset } from '@/features/gallery/stores/media-store';
import { findSavedOutput, removeFromIndex } from '@/features/gallery/services/media-index';
import { storeWorkflowSnapshot, type SnapshotCache } from '@/features/gallery/services/workflow-snapshots';
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

export interface SavedMedia {
  path: string;
  metadata: MediaAsset['metadata'];
}

/**
 * Saves a job's outputs with one index write between them.
 *
 * `save` puts each file in the gallery and the in-memory index at once, so it
 * shows up immediately; `commit` writes the index for all of them and must run
 * (in a `finally`) before the job counts as saved.
 *
 * The durability guarantee: a file never sits in the pool without a record of
 * it. Each file's metadata is journaled beside it (`<file>.json`) before the
 * file arrives, and its workflow snapshot is written before that. If the app
 * dies before `commit`, the next launch's orphan adoption indexes the file from
 * its journal, promptId and sourceId included, so recovery recognises it and
 * does not download it again. `commit` deletes the journals once the index is
 * durable.
 */
export interface MediaSaveBatch {
  save: (options: SaveMediaOptions) => Promise<SavedMedia>;
  /** Writes the index once for every save so far. Idempotent; saves after it stand alone. */
  commit: () => Promise<void>;
}

function ensureDirectory(dir: Directory) {
  dir.create({ intermediates: true, idempotent: true });
}

function removeQuietly(file: File) {
  try {
    if (file.exists) file.delete();
  } catch {
    // A stray journal is tidied by the next launch's orphan adoption.
  }
}

export function beginMediaSaveBatch(): MediaSaveBatch {
  const releaseHold = mediaStorage.hold();
  const releases: (() => void)[] = [];
  const snapshots: SnapshotCache = new WeakMap();
  const journals: File[] = [];
  let committed: Promise<void> | undefined;

  const commit = () =>
    (committed ??= (async () => {
      releaseHold();
      try {
        await mediaStorage.flush();
      } finally {
        releases.forEach((release) => release());
      }
      // Only once the index is durable: until then the journals are the record.
      journals.forEach(removeQuietly);
    })());

  const save = async ({ serverId, workflowId, mediaUrl, workflow, promptId, sourceId }: SaveMediaOptions) => {
    if (committed) return saveGeneratedMedia({ serverId, workflowId, mediaUrl, workflow, promptId, sourceId });
    await waitForMediaHydration();
    // A result the client downloaded into the cache is ours to consume.
    const downloaded = mediaUrl.startsWith(new Directory(Paths.cache, 'comfy-downloads').uri.replace(/\/?$/, '/'))
      ? new File(mediaUrl)
      : undefined;
    const existing = findSavedOutput({ serverId, promptId, sourceId, mediaUrl });
    if (existing) {
      if (downloaded?.exists) downloaded.delete();
      return { path: existing.path, metadata: existing.metadata };
    }

    // Written before anything refers to it. If it cannot be, the workflow
    // stays embedded in the asset and a later launch moves it out.
    let workflowRef: Pick<MediaAsset['metadata'], 'workflow' | 'workflowKey'>;
    try {
      const snapshot = await storeWorkflowSnapshot(workflow, snapshots);
      releases.push(snapshot.release);
      workflowRef = snapshot.key ? { workflowKey: snapshot.key } : {};
    } catch (error) {
      console.warn('failed to store the workflow snapshot; embedding it', error);
      workflowRef = { workflow: JSON.parse(JSON.stringify(workflow)) };
    }

    const directory = new Directory(Paths.document, 'media-v2');
    ensureDirectory(directory);
    const id = generateUUID();
    const parsed = new URL(mediaUrl);
    const sourceName = parsed.searchParams.get('filename') ?? parsed.pathname;
    const extension = sourceName.match(/\.(png|jpe?g|webp|gif|mp4|mov|webm|m4v)$/i)?.[1]?.toLowerCase() ?? 'png';
    const destination = new File(directory, id + '.' + extension);
    const metadata: MediaAsset['metadata'] = {
      timestamp: new Date().toISOString(),
      ...workflowRef,
      originalUrl: sourceId ?? mediaUrl,
      ...(sourceId ? { sourceId } : {}),
      ...(promptId ? { promptId } : {}),
      producedBy: resolveProvenance(serverId, workflowId),
    };
    const journal = new File(directory, id + '.' + extension + '.json');
    journal.create({ intermediates: true, overwrite: true });
    journal.write(JSON.stringify(metadata), { encoding: 'utf8' });
    journals.push(journal);
    try {
      // Moving a download is a rename on the same volume; copying rewrote every
      // video in full before deleting the original.
      if (downloaded) await downloaded.move(destination);
      else if (mediaUrl.startsWith('file://')) await new File(mediaUrl).copy(destination);
      else await File.downloadFileAsync(mediaUrl, destination, { idempotent: true });
    } catch (error) {
      removeQuietly(journal);
      throw error;
    }
    useMediaStore
      .getState()
      .upsert({ id, serverId, workflowId, kind: mediaKind(destination.uri), path: destination.uri, metadata });
    return { path: destination.uri, metadata };
  };

  return { save, commit };
}

/** One output, durable in the gallery index when this resolves. */
export async function saveGeneratedMedia(options: SaveMediaOptions): Promise<SavedMedia> {
  const batch = beginMediaSaveBatch();
  try {
    return await batch.save(options);
  } finally {
    await batch.commit();
  }
}

/** Deletes outputs: each file and its gallery entry, then persists the index. */
export async function deleteGeneratedMedia(paths: string[]) {
  await waitForMediaHydration();
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
  // index, so a batch leaves in one.
  await removeFromIndex(paths);
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
  await removeFromIndex(missing.map((asset) => asset.path));
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
