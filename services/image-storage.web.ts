import type { Workflow } from '@/features/workflow/types';
import { useMediaStore, waitForMediaHydration, mediaStorage, mediaKind } from '@/features/gallery/stores/media-store';
import { resolveProvenance } from '@/services/media-provenance';
import { generateUUID } from '@/utils/uuid';

interface SaveMediaOptions {
  serverId: string;
  workflowId: string;
  mediaUrl: string;
  workflow: Workflow;
  delete?: boolean;
  promptId?: string;
  sourceId?: string;
}

/** Web persists output references. Native downloads bytes into the application gallery. */
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
    store.remove(mediaUrl);
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
  const metadata = {
    timestamp: new Date().toISOString(),
    workflow: JSON.parse(JSON.stringify(workflow)),
    originalUrl: sourceId ?? mediaUrl,
    ...(sourceId ? { sourceId } : {}),
    ...(promptId ? { promptId } : {}),
    producedBy: resolveProvenance(serverId, workflowId),
  };
  const parsed = new URL(mediaUrl, 'http://localhost');
  store.upsert({
    id: generateUUID(),
    serverId,
    workflowId,
    path: mediaUrl,
    kind: mediaKind(parsed.searchParams.get('filename') ?? parsed.pathname),
    metadata,
  });
  await mediaStorage.flush();
  return { path: mediaUrl, metadata };
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
