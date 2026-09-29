import type { MediaProvenance } from '@/features/gallery/stores/media-store';
import { useServersStore } from '@/features/server/stores/server-store';
import { useWorkflowStore } from '@/features/workflow/stores/workflow-store';

/**
 * Snapshot where an asset came from, at the moment it is produced.
 *
 * Names are captured rather than looked up on read: the whole point is that a
 * gallery entry can still say "made on the 4090 box, from Portrait Upscale"
 * after both the connection and the workflow have been deleted. Nothing here
 * grants those entities any ownership over the asset — see `MediaAsset`.
 *
 * A missing server or binding is not an error. It means the user removed it
 * between queuing and download, and we simply record less.
 */
export function resolveProvenance(serverId: string, workflowId: string): MediaProvenance {
  const server = useServersStore.getState().servers.find((item) => item.id === serverId);
  const { assets, bindings } = useWorkflowStore.getState();
  const binding = bindings.find((item) => item.id === workflowId);
  const asset = binding ? assets.find((item) => item.id === binding.assetId) : undefined;
  return {
    serverId,
    ...(server?.name ? { serverName: server.name } : {}),
    workflowBindingId: workflowId,
    ...(binding ? { workflowAssetId: binding.assetId } : {}),
    ...(asset?.name ? { workflowName: asset.name } : {}),
  };
}
