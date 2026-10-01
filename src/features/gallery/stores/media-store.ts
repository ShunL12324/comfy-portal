import { createDurableStorage } from '@/services/durable-storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Workflow } from '@/features/workflow/types';
import { compareMediaTimeDesc } from '@/features/gallery/utils/media-time';

/**
 * Which machine and workflow produced an asset.
 *
 * Provenance only. The names are snapshots taken at generation time precisely
 * so that they stay readable after the server or workflow they name is gone —
 * resolving the ids is never required to display an asset.
 */
export interface MediaProvenance {
  serverId?: string;
  serverName?: string;
  workflowBindingId?: string;
  workflowAssetId?: string;
  workflowName?: string;
}

export interface MediaAsset {
  id: string;
  /**
   * Source index keys — not ownership, and not lifecycle.
   *
   * They record which connection and which workflow binding produced the asset
   * so views can filter by it, and they are allowed to dangle: once the user
   * deletes that server or workflow the ids resolve to nothing, and that is the
   * normal state, not an error. No read path may hide, skip or drop an asset
   * because they fail to resolve, and no cleanup, cascade or reclaim logic may
   * ever key off them. Assets live in one pool and outlive what made them.
   */
  serverId: string;
  workflowId: string;
  kind: 'image' | 'video';
  path: string;
  metadata: {
    timestamp: string;
    workflow: Workflow;
    originalUrl: string;
    sourceId?: string;
    promptId?: string;
    /** Written alongside the index keys above; survives their targets. */
    producedBy?: MediaProvenance;
  };
}

export function mediaKind(url: string): MediaAsset['kind'] {
  let path = url.split('?')[0].toLowerCase();
  try {
    const parsed = new URL(url, 'http://localhost');
    path = (parsed.searchParams.get('filename') ?? parsed.pathname).toLowerCase();
  } catch {
    /* Local filenames do not always form URLs. */
  }
  return /\.(mp4|mov|webm|m4v)$/.test(path) ? 'video' : 'image';
}

/** Downloaded outputs are independent assets, not children deleted with a connection. */
export const mediaStorage = createDurableStorage(AsyncStorage);

export const useMediaStore = create<{
  assets: MediaAsset[];
  upsert: (asset: MediaAsset) => void;
  remove: (path: string) => void;
}>()(
  persist(
    (set) => ({
      assets: [],
      upsert: (asset) =>
        set((state) => ({
          assets: [
            ...state.assets.filter((item) => item.id !== asset.id),
            JSON.parse(JSON.stringify(asset)) as MediaAsset,
          ].sort((a, b) => compareMediaTimeDesc(a.metadata.timestamp, b.metadata.timestamp)),
        })),
      remove: (path) => set((state) => ({ assets: state.assets.filter((item) => item.path !== path) })),
    }),
    { name: 'cp-media-v2', storage: createJSONStorage(() => mediaStorage) },
  ),
);

export async function waitForMediaHydration(): Promise<void> {
  if (useMediaStore.persist.hasHydrated()) return;
  await new Promise<void>((resolve) => {
    const unsubscribe = useMediaStore.persist.onFinishHydration(() => {
      unsubscribe();
      resolve();
    });
    if (useMediaStore.persist.hasHydrated()) {
      unsubscribe();
      resolve();
    }
  });
}
