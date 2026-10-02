import { mediaStorage, useMediaStore, type MediaAsset } from '@/features/gallery/stores/media-store';
import { dropWorkflowSnapshots } from '@/features/gallery/services/workflow-snapshots';

/** Shared by the native and web image-storage: index lookups and removal. */

/** An output of `promptId` already in the gallery, so recovery never saves it twice. */
export function findSavedOutput({
  serverId,
  promptId,
  sourceId,
  mediaUrl,
}: {
  serverId: string;
  promptId?: string;
  sourceId?: string;
  mediaUrl: string;
}): MediaAsset | undefined {
  if (!promptId) return undefined;
  return useMediaStore
    .getState()
    .assets.find(
      (item) =>
        item.serverId === serverId &&
        item.metadata.promptId === promptId &&
        (sourceId ? item.metadata.sourceId === sourceId : item.metadata.originalUrl === mediaUrl),
    );
}

/**
 * Removes entries in one update and one index write, then the workflow
 * snapshots nothing references any more. Snapshots go only after the index is
 * durable, so no persisted entry ever points at a deleted snapshot.
 */
export async function removeFromIndex(paths: string[]) {
  if (!paths.length) return;
  const gone = new Set(paths);
  const removedKeys = useMediaStore
    .getState()
    .assets.filter((asset) => gone.has(asset.path) && asset.metadata.workflowKey)
    .map((asset) => asset.metadata.workflowKey!);
  useMediaStore.getState().removeMany(paths);
  await mediaStorage.flush();
  if (!removedKeys.length) return;
  const stillUsed = new Set(
    useMediaStore
      .getState()
      .assets.map((asset) => asset.metadata.workflowKey)
      .filter((key): key is string => !!key),
  );
  try {
    await dropWorkflowSnapshots(removedKeys, stillUsed);
  } catch (error) {
    // A leftover snapshot only costs space; the entries are already gone.
    console.warn('failed to drop unused workflow snapshots', error);
  }
}
