import { Model, Server } from '@/features/server/types';
import { checkMultipleServers, checkServerStatus } from '@/features/server/utils/server-sync';
import { cleanupServerData } from '@/services/image-storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateUUID } from '@/utils/uuid';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

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
  updateServerStatus: (
    id: string,
    status: Server['status'],
    latency?: number,
    models?: Model[],
    CPEEnable?: boolean,
  ) => void;
  refreshServers: () => Promise<void>;
  refreshServer: (id: string) => Promise<void>;
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

      updateServerStatus: (id, status, latency, models, CPEEnable) =>
        set((state) => ({
          servers: state.servers.map((s) =>
            s.id === id
              ? {
                ...s,
                status,
                latency,
                CPEEnable,
                ...(models && {
                  models,
                  lastModelSync: Date.now(),
                }),
                ...(status === 'offline' && { CPEEnable: undefined }),
              }
              : s,
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
                  ...(result.models && {
                    models: result.models,
                    lastModelSync: Date.now(),
                  }),
                  ...(result.status === 'offline' && { CPEEnable: undefined }),
                };
              }
              return server;
            }),
          }));
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
                    ...(result.models && {
                      models: result.models,
                      lastModelSync: Date.now(),
                    }),
                    ...(result.status === 'offline' && { CPEEnable: undefined }),
                  }
                : s,
            ),
          }));
        } catch (error) {
          // Silently handle error
        }
      },
    }),
    {
      name: 'servers-storage',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
