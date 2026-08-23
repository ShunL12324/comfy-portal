import { Model, Server } from '@/features/server/types';
import {
  SyncModelsOptions,
  checkMultipleServers,
  checkServerStatus,
  syncServerModels,
} from '@/features/server/utils/server-sync';
import { cleanupServerData } from '@/services/image-storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateUUID } from '@/utils/uuid';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/**
 * How long a model catalogue is considered fresh. Short, because the thing that
 * invalidates it is the user downloading a model onto their own server and then
 * immediately opening a workflow that uses it.
 */
export const MODEL_CACHE_MAX_AGE = 5 * 60 * 1000;

/**
 * In-flight model syncs, keyed by server + scope. Several pickers mount at once
 * on a workflow page and would otherwise each kick off their own scan.
 * Module-level rather than store state: it's coordination, not data, and it
 * must never be persisted.
 */
const inFlightModelSyncs = new Map<string, Promise<void>>();

interface ServersState {
  servers: Server[];
  loading: boolean;
  addServer: (
    server: Omit<
      Server,
      'id' | 'status' | 'latency' | 'models' | 'lastModelSync'
    >,
  ) => void;
  removeServer: (id: string) => void;
  updateServer: (
    id: string,
    updates: Partial<
      Omit<Server, 'id' | 'status' | 'latency' | 'models' | 'lastModelSync'>
    >,
  ) => void;
  refreshServers: () => Promise<void>;
  refreshServer: (id: string) => Promise<void>;
  /** Rescan a server's models now. Concurrent calls with the same scope share one scan. */
  syncModels: (id: string, options?: SyncModelsOptions) => Promise<void>;
  /** Rescan only if the cached catalogue is older than `maxAge`. */
  ensureModelsFresh: (id: string, maxAge?: number) => Promise<void>;
}

export const useServersStore = create<ServersState>()(
  persist(
    (set, get) => ({
      servers: [],
      loading: false,

      addServer: (server) => {
        const newServer: Server = {
          ...server,
          id: generateUUID(),
          status: 'offline',
        };
        set((state) => ({
          servers: [...state.servers, newServer],
        }));
      },

      removeServer: (id) =>
        set((state) => {
          // Clean up server data
          cleanupServerData(id).catch(console.error);
          // Clean up all chat sessions for this server (lazy require to avoid side-effect issues)
          const { useChatSessionStore } = require('@/features/ai-assistant/stores/chat-session-store');
          useChatSessionStore.getState().clearServerSessions(id);
          return {
            servers: state.servers.filter((s) => s.id !== id),
          };
        }),

      updateServer: (id, updates) =>
        set((state) => ({
          servers: state.servers.map((s) =>
            s.id === id ? { ...s, ...updates } : s,
          ),
        })),


      refreshServers: async () => {
        set({ loading: true });
        try {
          // update all servers to refreshing state
          set((state) => ({
            servers: state.servers.map((server) => ({
              ...server,
              status: 'refreshing',
            })),
          }));
          const servers = get().servers;
          const results = await checkMultipleServers(servers);
          set((state) => ({
            servers: state.servers.map((server) => {
              const result = results.find((r) => r.id === server.id);
              if (result) {
                return {
                  ...server,
                  status: result.status,
                  latency: result.latency,
                  CPEEnable: result.CPEEnable,
                  ...(result.status === 'offline' && { CPEEnable: undefined }),
                };
              }
              return server;
            }),
          }));

          // An explicit refresh is the user asking us to re-check everything,
          // preview images included.
          await Promise.all(
            results
              .filter((result) => result.status === 'online')
              .map((result) => get().syncModels(result.id, { refreshPreviews: true })),
          );
        } catch (error) {
          // Silently handle error
        } finally {
          set({ loading: false });
        }
      },

      refreshServer: async (id) => {
        const server = get().servers.find((s) => s.id === id);
        if (!server) return;

        try {
          // update the target server status to refreshing
          set((state) => ({
            servers: state.servers.map((s) =>
              s.id === id ? { ...s, status: 'refreshing' } : s,
            ),
          }));
          const result = await checkServerStatus(server);
          set((state) => ({
            servers: state.servers.map((s) =>
              s.id === id
                ? {
                    ...s,
                    status: result.status,
                    latency: result.latency,
                    CPEEnable: result.CPEEnable,
                    ...(result.status === 'offline' && { CPEEnable: undefined }),
                  }
                : s,
            ),
          }));

          if (result.status === 'online') {
            await get().syncModels(id, { refreshPreviews: true });
          }
        } catch (error) {
          // Silently handle error
        }
      },

      syncModels: async (id, options = {}) => {
        const scope = (options.folders ?? []).slice().sort().join(',');
        const key = `${id}|${scope}|${options.refreshPreviews ? 'previews' : ''}`;
        const existing = inFlightModelSyncs.get(key);
        if (existing) return existing;

        const run = (async () => {
          const server = get().servers.find((s) => s.id === id);
          if (!server) return;

          const models = await syncServerModels(server, options);
          // `null` means the server never answered. Keeping the stale catalogue
          // beats blanking every model picker over one dropped request.
          if (!models) return;

          set((state) => ({
            servers: state.servers.map((s) =>
              s.id === id ? { ...s, models, lastModelSync: Date.now() } : s,
            ),
          }));
        })().finally(() => {
          inFlightModelSyncs.delete(key);
        });

        inFlightModelSyncs.set(key, run);
        return run;
      },

      ensureModelsFresh: async (id, maxAge = MODEL_CACHE_MAX_AGE) => {
        const server = get().servers.find((s) => s.id === id);
        if (!server) return;
        if (server.lastModelSync && Date.now() - server.lastModelSync < maxAge) return;
        await get().syncModels(id);
      },
    }),
    {
      name: 'servers-storage',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
