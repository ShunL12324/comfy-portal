import { createDurableStorage } from '@/services/durable-storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist, type PersistStorage, type StorageValue } from 'zustand/middleware';
import type { Workflow } from '@/features/workflow/types';
import { compareMediaTimeDesc } from '@/features/gallery/utils/media-time';
import {
  readWorkflowSnapshot,
  serialiseWorkflow,
  workflowKeyOf,
  writeWorkflowSnapshots,
} from '@/features/gallery/services/workflow-snapshots';

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
    /**
     * Key of the workflow snapshot this was generated from (see
     * `workflow-snapshots`). Read it through `getAssetWorkflow`.
     */
    workflowKey?: string;
    /**
     * The workflow copied into the asset, as index version 0 stored it. Only
     * present until `externalizeWorkflows` moves it out; read it through
     * `getAssetWorkflow`.
     */
    workflow?: Workflow;
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

type MediaState = { assets: MediaAsset[] };

/**
 * Persisted index storage that can hold writes back.
 *
 * Every store update serialises and writes the whole index. While a hold is
 * open (a job saving its outputs) updates only replace the pending value; the
 * last one is serialised and written once, when the hold is released or
 * someone flushes. Without a hold it writes on every update, as before.
 */
function createMediaIndexStorage(durable: ReturnType<typeof createDurableStorage>) {
  let holds = 0;
  let pending: { name: string; value: StorageValue<MediaState> } | undefined;
  const commit = () => {
    if (!pending) return;
    const { name, value } = pending;
    pending = undefined;
    return durable.setItem(name, JSON.stringify(value));
  };
  const storage: PersistStorage<MediaState> = {
    getItem: async (name) => {
      const text = await durable.getItem(name);
      return text ? (JSON.parse(text) as StorageValue<MediaState>) : null;
    },
    setItem: (name, value) => {
      pending = { name, value };
      if (!holds) return commit();
    },
    removeItem: (name) => {
      pending = undefined;
      return durable.removeItem(name);
    },
  };
  return {
    ...storage,
    /** Defers index writes until the returned release, or a flush. */
    hold: () => {
      holds += 1;
      let released = false;
      return () => {
        if (released) return;
        released = true;
        holds -= 1;
        if (!holds) void commit();
      };
    },
    /** Writes anything held back, then waits for every write to land. */
    flush: async () => {
      void commit();
      await durable.flush();
    },
  };
}

/** Downloaded outputs are independent assets, not children deleted with a connection. */
export const mediaStorage = createMediaIndexStorage(createDurableStorage(AsyncStorage));

/**
 * Moves embedded workflows into snapshot storage and points the assets at them.
 *
 * Lossless: the snapshots are written before any asset gives up its copy, and
 * if that write fails the assets come back unchanged. Idempotent: assets with
 * nothing embedded pass through, and rewriting a snapshot stores identical
 * content under the same key.
 */
export async function externalizeWorkflows(assets: MediaAsset[]): Promise<MediaAsset[]> {
  const snapshots = new Map<string, string>();
  const keys = new Map<MediaAsset, string | undefined>();
  // Outputs of one job carry identical copies; each distinct one is hashed once.
  const keyOfJson = new Map<string, string>();
  for (const asset of assets) {
    if (!asset?.metadata || !('workflow' in asset.metadata)) continue;
    const json = serialiseWorkflow(asset.metadata.workflow);
    let key: string | undefined;
    if (json) {
      key = keyOfJson.get(json);
      if (!key) {
        key = await workflowKeyOf(json);
        keyOfJson.set(json, key);
        snapshots.set(key, json);
      }
    }
    keys.set(asset, key);
  }
  if (!keys.size) return assets;
  try {
    await writeWorkflowSnapshots(snapshots);
  } catch (error) {
    console.warn('workflow snapshots could not be written; keeping them embedded', error);
    return assets;
  }
  return assets.map((asset) => {
    if (!keys.has(asset)) return asset;
    const { workflow: _embedded, ...metadata } = asset.metadata;
    const key = keys.get(asset) ?? metadata.workflowKey;
    return { ...asset, metadata: { ...metadata, ...(key ? { workflowKey: key } : {}) } };
  });
}

/** The workflow an asset was generated from; `undefined` when none was recorded. */
export async function getAssetWorkflow(asset: MediaAsset): Promise<Workflow | undefined> {
  const embedded = asset.metadata.workflow;
  if (embedded && Object.keys(embedded).length) return embedded;
  return asset.metadata.workflowKey ? readWorkflowSnapshot(asset.metadata.workflowKey) : undefined;
}

export const useMediaStore = create<
  MediaState & {
    upsert: (asset: MediaAsset) => void;
    remove: (path: string) => void;
    /** One update, and one write of the persisted index, for any number of paths. */
    removeMany: (paths: string[]) => void;
  }
>()(
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
      removeMany: (paths) => {
        if (!paths.length) return;
        const gone = new Set(paths);
        set((state) => ({ assets: state.assets.filter((item) => !gone.has(item.path)) }));
      },
    }),
    {
      name: 'cp-media-v2',
      storage: mediaStorage,
      partialize: (state) => ({ assets: state.assets }),
      // 0: every asset embeds its workflow. 1: assets reference workflow snapshots.
      version: 1,
      migrate: async (persisted, version) => {
        const state = persisted as MediaState | undefined;
        // Never throws: a failed migration leaves the store unhydrated, and the
        // next update would then overwrite the gallery with an empty one.
        if (version >= 1 || !state || !Array.isArray(state.assets)) return state as MediaState;
        try {
          return { ...state, assets: await externalizeWorkflows(state.assets) };
        } catch (error) {
          console.warn('media index migration failed; keeping workflows embedded', error);
          return state;
        }
      },
    },
  ),
);

/**
 * Moves any workflow still embedded in the index into snapshot storage, in one
 * index write. Picks up what the version migration could not write, and what
 * legacy-file adoption brings in.
 */
export async function compactEmbeddedWorkflows(): Promise<number> {
  const embedded = useMediaStore.getState().assets.filter((asset) => 'workflow' in asset.metadata);
  if (!embedded.length) return 0;
  const moved = await externalizeWorkflows(embedded);
  const replacements = new Map<string, MediaAsset>();
  moved.forEach((asset, index) => {
    if (asset !== embedded[index]) replacements.set(asset.id, asset);
  });
  if (!replacements.size) return 0;
  // The index may have changed while the snapshots were written; only assets
  // still holding the very copy that was moved are replaced.
  const original = new Map(embedded.map((asset) => [asset.id, asset]));
  useMediaStore.setState((state) => ({
    assets: state.assets.map((asset) =>
      replacements.has(asset.id) && original.get(asset.id) === asset ? replacements.get(asset.id)! : asset,
    ),
  }));
  await mediaStorage.flush();
  return replacements.size;
}

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
