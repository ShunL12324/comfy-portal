import type { Workflow } from '@/features/workflow/types';
import { useMediaStore, waitForMediaHydration, mediaStorage, mediaKind } from '@/features/gallery/stores/media-store';
import type { MediaAsset } from '@/features/gallery/stores/media-store';
import { findSavedOutput, removeFromIndex } from '@/features/gallery/services/media-index';
import { storeWorkflowSnapshot, type SnapshotCache } from '@/features/gallery/services/workflow-snapshots';
import { mediaTime } from '@/features/gallery/utils/media-time';
import { resolveProvenance } from '@/services/media-provenance';
import { generateUUID } from '@/utils/uuid';

interface SaveMediaOptions {
  serverId: string;
  workflowId: string;
  mediaUrl: string;
  workflow: Workflow;
  promptId?: string;
  sourceId?: string;
}

export interface SavedMedia {
  path: string;
  metadata: MediaAsset['metadata'];
}

/** A job's outputs with one index write between them; see the native file. Web has no files to journal. */
export interface MediaSaveBatch {
  save: (options: SaveMediaOptions) => Promise<SavedMedia>;
  commit: () => Promise<void>;
}

export function beginMediaSaveBatch(): MediaSaveBatch {
  const releaseHold = mediaStorage.hold();
  const releases: (() => void)[] = [];
  const snapshots: SnapshotCache = new WeakMap();
  let committed: Promise<void> | undefined;

  const commit = () =>
    (committed ??= (async () => {
      releaseHold();
      try {
        await mediaStorage.flush();
      } finally {
        releases.forEach((release) => release());
      }
    })());

  /** Web persists output references. Native downloads bytes into the application gallery. */
  const save = async ({ serverId, workflowId, mediaUrl, workflow, promptId, sourceId }: SaveMediaOptions) => {
    if (committed) return saveGeneratedMedia({ serverId, workflowId, mediaUrl, workflow, promptId, sourceId });
    await waitForMediaHydration();
    const existing = findSavedOutput({ serverId, promptId, sourceId, mediaUrl });
    if (existing) return { path: existing.path, metadata: existing.metadata };
    let workflowRef: Pick<MediaAsset['metadata'], 'workflow' | 'workflowKey'>;
    try {
      const snapshot = await storeWorkflowSnapshot(workflow, snapshots);
      releases.push(snapshot.release);
      workflowRef = snapshot.key ? { workflowKey: snapshot.key } : {};
    } catch (error) {
      console.warn('failed to store the workflow snapshot; embedding it', error);
      workflowRef = { workflow: JSON.parse(JSON.stringify(workflow)) };
    }
    const metadata: MediaAsset['metadata'] = {
      timestamp: new Date().toISOString(),
      ...workflowRef,
      originalUrl: sourceId ?? mediaUrl,
      ...(sourceId ? { sourceId } : {}),
      ...(promptId ? { promptId } : {}),
      producedBy: resolveProvenance(serverId, workflowId),
    };
    const parsed = new URL(mediaUrl, 'http://localhost');
    useMediaStore.getState().upsert({
      id: generateUUID(),
      serverId,
      workflowId,
      path: mediaUrl,
      kind: mediaKind(parsed.searchParams.get('filename') ?? parsed.pathname),
      metadata,
    });
    return { path: mediaUrl, metadata };
  };

  return { save, commit };
}

export async function saveGeneratedMedia(options: SaveMediaOptions): Promise<SavedMedia> {
  const batch = beginMediaSaveBatch();
  try {
    return await batch.save(options);
  } finally {
    await batch.commit();
  }
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
  // On web, just return the URL as-is (no local file copy needed)
  if (shouldDelete) {
    return;
  }
  return {
    path: imageUri,
  };
}

// Removing a connection does not delete independent gallery assets. See the
// native file for why this stays and why it stays empty. Its per-workflow twin
// was removed as dead code.
export async function cleanupServerData(_serverId: string) {}

/** Web keeps references, not files: deleting an output only removes its gallery entry. */
export async function deleteGeneratedMedia(paths: string[]) {
  await waitForMediaHydration();
  await removeFromIndex(paths);
}

/** Web entries are server references with no local file to go missing. */
export async function pruneMissingMedia() {}
