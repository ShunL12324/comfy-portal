import {
  Workflow,
  WorkflowRecord,
  WorkflowAsset,
  WorkflowBinding,
  ServerWorkflowSnapshot,
} from '@/features/workflow/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateUUID } from '@/utils/uuid';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { uniqueCopyName } from '../utils/copy-name';
import { contentKey, hasLocalWorkflowChanges, serverWorkflowFilename } from '../utils/workflow-source';

interface WorkflowStoreState {
  assets: WorkflowAsset[];
  bindings: WorkflowBinding[];
  hiddenServerWorkflows: Record<string, string[]>;
  lastServerSync: Record<string, string>;
  /** Stable materialized view for existing node/rendering consumers; never persisted. */
  workflow: WorkflowRecord[];
  addWorkflow: (record: Omit<WorkflowRecord, 'id' | 'createdAt'>) => string;
  importAsset: (assetId: string, serverId: string) => string | undefined;
  detachServer: (serverId: string) => void;
  removeWorkflow: (id: string) => void;
  /** Deletes a workflow from history: the kept asset and every server list it is on. */
  removeAsset: (assetId: string) => void;
  updateWorkflow: (id: string, updates: Partial<Omit<WorkflowRecord, 'id'>>) => void;
  updateUsage: (id: string) => void;
  updateNodeInput: (workflowId: string, nodeId: string, inputKey: string, value: unknown) => void;
  restoreWorkflowData: (workflowId: string, data: Workflow) => void;
  receiveServerWorkflow: (serverId: string, filename: string, snapshot: ServerWorkflowSnapshot) => void;
  reconcileServerWorkflows: (serverId: string, filenames: string[], syncedAt?: string) => void;
  applyServerUpdate: (id: string, keepLocalCopy?: boolean) => void;
  keepAsImported: (id: string) => void;
  restoreHiddenServerWorkflow: (serverId: string, filename: string) => void;
  clearServerSyncedWorkflows: (serverId: string) => void;
}

export function materializeWorkflows(assets: WorkflowAsset[], bindings: WorkflowBinding[]): WorkflowRecord[] {
  const byId = new Map(assets.map((asset) => [asset.id, asset]));
  return bindings.flatMap((binding) => {
    const asset = byId.get(binding.assetId);
    if (!asset) return [];
    return [
      {
        id: binding.id,
        serverId: binding.serverId,
        name: asset.name,
        data: asset.data,
        thumbnail: asset.thumbnail,
        createdAt: new Date(asset.createdAt),
        lastUsed: binding.lastUsed ? new Date(binding.lastUsed) : undefined,
        addMethod: binding.addMethod,
        metadata: binding.metadata,
        serverSync: binding.serverSync,
      },
    ];
  });
}

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

export const useWorkflowStore = create<WorkflowStoreState>()(
  persist(
    (set, get) => {
      const commit = (assets: WorkflowAsset[], bindings: WorkflowBinding[], extras: Partial<WorkflowStoreState> = {}) =>
        set({ ...extras, assets, bindings, workflow: materializeWorkflows(assets, bindings) });
      return {
        assets: [],
        bindings: [],
        workflow: [],
        hiddenServerWorkflows: {},
        lastServerSync: {},
        addWorkflow: (record) => {
          const state = get();
          const now = new Date().toISOString();
          const asset: WorkflowAsset = {
            id: generateUUID(),
            name: uniqueCopyName(
              record.name,
              state.workflow.filter((item) => item.serverId === record.serverId).map((item) => item.name),
            ),
            data: clone(record.data),
            thumbnail: record.thumbnail,
            createdAt: now,
            updatedAt: now,
          };
          const binding: WorkflowBinding = {
            id: generateUUID(),
            assetId: asset.id,
            serverId: record.serverId,
            addMethod: record.addMethod,
            metadata: record.metadata ? clone(record.metadata) : undefined,
            serverSync: record.serverSync
              ? clone({
                  ...record.serverSync,
                  base: record.serverSync.base ? { ...record.serverSync.base, name: asset.name } : undefined,
                })
              : undefined,
            lastUsed: record.lastUsed ? new Date(record.lastUsed).toISOString() : undefined,
          };
          commit([...state.assets, asset], [...state.bindings, binding]);
          return binding.id;
        },
        importAsset: (assetId, serverId) => {
          const asset = get().assets.find((item) => item.id === assetId);
          if (!asset) return;
          return get().addWorkflow({
            name: asset.name,
            data: asset.data,
            thumbnail: asset.thumbnail,
            serverId,
            addMethod: 'file',
          });
        },
        detachServer: (serverId) =>
          commit(
            get().assets,
            get().bindings.filter((item) => item.serverId !== serverId),
          ),
        removeWorkflow: (id) => {
          const state = get();
          const record = state.workflow.find((item) => item.id === id);
          const filename = record && serverWorkflowFilename(record);
          const hiddenServerWorkflows =
            filename && record
              ? {
                  ...state.hiddenServerWorkflows,
                  [record.serverId]: Array.from(
                    new Set([...(state.hiddenServerWorkflows[record.serverId] ?? []), filename]),
                  ),
                }
              : state.hiddenServerWorkflows;
          commit(
            state.assets,
            state.bindings.filter((item) => item.id !== id),
            { hiddenServerWorkflows },
          );
        },
        removeAsset: (assetId) => {
          // Through removeWorkflow, so a server-synced copy stays hidden instead of syncing back.
          for (const binding of get().bindings.filter((item) => item.assetId === assetId))
            get().removeWorkflow(binding.id);
          const state = get();
          commit(
            state.assets.filter((asset) => asset.id !== assetId),
            state.bindings,
          );
        },
        updateWorkflow: (id, updates) => {
          const state = get();
          const binding = state.bindings.find((item) => item.id === id);
          if (!binding) return;
          const assets = state.assets.map((asset) =>
            asset.id !== binding.assetId
              ? asset
              : {
                  ...asset,
                  ...(updates.name !== undefined ? { name: updates.name } : {}),
                  ...(updates.data !== undefined ? { data: clone(updates.data) } : {}),
                  ...(updates.thumbnail !== undefined ? { thumbnail: updates.thumbnail } : {}),
                  updatedAt: new Date().toISOString(),
                },
          );
          const bindings = state.bindings.map((item) =>
            item.id !== id
              ? item
              : {
                  ...item,
                  ...(updates.serverId !== undefined ? { serverId: updates.serverId } : {}),
                  ...(updates.addMethod !== undefined ? { addMethod: updates.addMethod } : {}),
                  ...(updates.metadata !== undefined ? { metadata: clone(updates.metadata) } : {}),
                  ...(updates.serverSync !== undefined ? { serverSync: clone(updates.serverSync) } : {}),
                  ...(updates.lastUsed !== undefined ? { lastUsed: new Date(updates.lastUsed).toISOString() } : {}),
                },
          );
          commit(assets, bindings);
        },
        updateUsage: (id) => get().updateWorkflow(id, { lastUsed: new Date() }),
        updateNodeInput: (workflowId, nodeId, inputKey, value) => {
          const record = get().workflow.find((item) => item.id === workflowId);
          const node = record?.data[nodeId];
          if (!record || !node || Object.is(node.inputs[inputKey], value)) return;
          const state = get();
          const binding = state.bindings.find((item) => item.id === workflowId);
          if (!binding) return;
          // Keep untouched node identities stable so memoized node controls do
          // not remount/re-render for a single input edit. Own the incoming value
          // without cloning the entire graph on every initialization/keystroke.
          const ownedValue = value === undefined ? value : clone(value);
          const assets = state.assets.map((asset) =>
            asset.id !== binding.assetId
              ? asset
              : {
                  ...asset,
                  data: {
                    ...asset.data,
                    [nodeId]: { ...node, inputs: { ...node.inputs, [inputKey]: ownedValue } },
                  },
                  updatedAt: new Date().toISOString(),
                },
          );
          commit(assets, state.bindings);
        },
        restoreWorkflowData: (id, data) => get().updateWorkflow(id, { data }),
        receiveServerWorkflow: (serverId, filename, snapshot) => {
          const state = get();
          if (state.hiddenServerWorkflows[serverId]?.includes(filename)) return;
          const record = state.workflow.find(
            (item) => item.serverId === serverId && serverWorkflowFilename(item) === filename,
          );
          const metadata = {
            originalFilename: filename,
            serverFileModified: snapshot.modified,
            serverFileSize: snapshot.size,
            raw_content: snapshot.rawContent,
            lastSyncedAt: new Date().toISOString(),
          };
          if (!record) {
            state.addWorkflow({
              serverId,
              name: snapshot.name,
              data: snapshot.data,
              addMethod: 'server-sync',
              metadata,
              serverSync: { filename, base: snapshot },
            });
            return;
          }
          const base = record.serverSync?.base;
          const dirty = hasLocalWorkflowChanges(record);
          // No baseline in legacy storage: preserve everything, adopt the
          // observed original and offer an explicit update if they differ.
          if (!base || dirty) {
            const differs = record.name !== snapshot.name || contentKey(record.data) !== contentKey(snapshot.data);
            const changed = !base || contentKey(base.data) !== contentKey(snapshot.data);
            state.updateWorkflow(record.id, {
              metadata: { ...record.metadata, ...metadata },
              serverSync: {
                filename,
                base: base ?? snapshot,
                incoming: changed && differs ? snapshot : undefined,
                sourceMissing: false,
              },
            });
            return;
          }
          const name = uniqueCopyName(
            snapshot.name,
            state.workflow
              .filter((item) => item.serverId === serverId && item.id !== record.id)
              .map((item) => item.name),
          );
          state.updateWorkflow(record.id, {
            name,
            data: snapshot.data,
            metadata: { ...record.metadata, ...metadata },
            serverSync: { filename, base: { ...snapshot, name }, sourceMissing: false },
          });
        },
        reconcileServerWorkflows: (serverId, filenames, syncedAt) => {
          const state = get();
          const present = new Set(filenames);
          const bindings = state.bindings.map((binding) => {
            if (binding.serverId !== serverId || binding.addMethod !== 'server-sync') return binding;
            const filename = binding.serverSync?.filename ?? binding.metadata?.originalFilename;
            if (!filename) return binding;
            const sourceMissing = !present.has(filename);
            return {
              ...binding,
              serverSync: {
                ...binding.serverSync,
                filename,
                sourceMissing,
                incoming: sourceMissing ? undefined : binding.serverSync?.incoming,
              },
            };
          });
          commit(
            state.assets,
            bindings,
            syncedAt ? { lastServerSync: { ...state.lastServerSync, [serverId]: syncedAt } } : {},
          );
        },
        applyServerUpdate: (id, keepLocalCopy = false) => {
          const state = get();
          const record = state.workflow.find((item) => item.id === id);
          const incoming = record?.serverSync?.incoming;
          const binding = state.bindings.find((item) => item.id === id);
          if (!record || !binding || !incoming || record.serverSync?.sourceMissing) return;
          let assets = [...state.assets];
          let bindings = [...state.bindings];
          if (keepLocalCopy) {
            const now = new Date().toISOString();
            const asset: WorkflowAsset = {
              id: generateUUID(),
              name: uniqueCopyName(
                `${record.name} (local copy)`,
                state.workflow.filter((item) => item.serverId === record.serverId).map((item) => item.name),
              ),
              data: clone(record.data),
              thumbnail: record.thumbnail,
              createdAt: now,
              updatedAt: now,
            };
            assets.push(asset);
            bindings.push({ id: generateUUID(), assetId: asset.id, serverId: record.serverId, addMethod: 'file' });
          }
          const name = uniqueCopyName(
            incoming.name,
            materializeWorkflows(assets, bindings)
              .filter((item) => item.serverId === record.serverId && item.id !== id)
              .map((item) => item.name),
          );
          assets = assets.map((asset) =>
            asset.id === binding.assetId
              ? { ...asset, name, data: clone(incoming.data), updatedAt: new Date().toISOString() }
              : asset,
          );
          bindings = bindings.map((item) =>
            item.id === id
              ? {
                  ...item,
                  serverSync: {
                    filename: record.serverSync!.filename,
                    base: clone({ ...incoming, name }),
                    sourceMissing: false,
                  },
                }
              : item,
          );
          commit(assets, bindings);
        },
        keepAsImported: (id) => {
          const state = get();
          const record = state.workflow.find((item) => item.id === id);
          const filename = record && serverWorkflowFilename(record);
          if (!record || !filename) return;
          const hiddenServerWorkflows = {
            ...state.hiddenServerWorkflows,
            [record.serverId]: Array.from(new Set([...(state.hiddenServerWorkflows[record.serverId] ?? []), filename])),
          };
          commit(
            state.assets,
            state.bindings.map((item) =>
              item.id === id
                ? { ...item, addMethod: 'file' as const, serverSync: undefined, metadata: undefined }
                : item,
            ),
            { hiddenServerWorkflows },
          );
        },
        restoreHiddenServerWorkflow: (serverId, filename) => {
          const state = get();
          set({
            hiddenServerWorkflows: {
              ...state.hiddenServerWorkflows,
              [serverId]: (state.hiddenServerWorkflows[serverId] ?? []).filter((item) => item !== filename),
            },
          });
        },
        clearServerSyncedWorkflows: (serverId) =>
          commit(
            get().assets,
            get().bindings.filter((item) => item.serverId !== serverId || item.addMethod !== 'server-sync'),
          ),
      };
    },
    {
      name: 'cp-workflows-v2',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ assets, bindings, hiddenServerWorkflows, lastServerSync }) => ({
        assets,
        bindings,
        hiddenServerWorkflows,
        lastServerSync,
      }),
      merge: (saved, current) => {
        const data = saved as Pick<
          WorkflowStoreState,
          'assets' | 'bindings' | 'hiddenServerWorkflows' | 'lastServerSync'
        >;
        const assets = data?.assets ?? [];
        const bindings = data?.bindings ?? [];
        return {
          ...current,
          assets,
          bindings,
          hiddenServerWorkflows: data?.hiddenServerWorkflows ?? {},
          lastServerSync: data?.lastServerSync ?? {},
          workflow: materializeWorkflows(assets, bindings),
        };
      },
    },
  ),
);
