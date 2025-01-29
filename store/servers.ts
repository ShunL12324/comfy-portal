import { Model, Server } from '@/types/server';
import { cleanupServerData } from '@/utils/image-storage';
import { checkMultipleServers, checkServerStatus } from '@/utils/server-status';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
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
          id: Crypto.randomUUID(),
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

      updateServerStatus: (id, status, latency, models) =>
        set((state) => ({
          servers: state.servers.map((s) =>
            s.id === id
              ? {
                ...s,
                status,
                latency,
                ...(models && {
                  models,
                  lastModelSync: Date.now(),
                }),
              }
              : s,
          ),
        })),

      refreshServers: async () => {
        set({ loading: true });
        try {
          // update all servers to refreshing state
          set((state) => ({
            servers: state.servers.map((server) => {
              return {
                ...server,
                status: 'refreshing'
              }
            })
          }))
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
                  ...(result.models && {
                    models: result.models,
                    lastModelSync: Date.now(),
                  }),
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
          // update the targer server status to refreshing
          set((state) => ({
            servers: state.servers.map((s) =>
              s.id === id ? {
                ...s,
                status: 'refreshing'
              }
                : s,
            ),
          }))
          const result = await checkServerStatus(server);
          set((state) => ({
            servers: state.servers.map((s) =>
              s.id === id
                ? {
                  ...s,
                  status: result.status,
                  latency: result.latency,
                  ...(result.models && {
                    models: result.models,
                    lastModelSync: Date.now(),
                  }),
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
