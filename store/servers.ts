import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { checkMultipleServers } from '@/utils/server-status';
import * as Crypto from 'expo-crypto';

export interface Server {
  id: string;
  name: string;
  domain: string;
  port: number;
  status: 'online' | 'offline';
  latency: number;
}

interface ServersState {
  servers: Server[];
  loading: boolean;
  addServer: (server: Omit<Server, 'id' | 'status' | 'latency'>) => void;
  removeServer: (id: string) => void;
  updateServer: (id: string, server: Partial<Server>) => void;
  refreshServers: () => Promise<void>;
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
          latency: 0,
        };
        set((state) => ({
          servers: [...state.servers, newServer],
        }));
      },

      removeServer: (id) => {
        set((state) => ({
          servers: state.servers.filter((server) => server.id !== id),
        }));
      },

      updateServer: (id, updatedServer) => {
        set((state) => ({
          servers: state.servers.map((server) =>
            server.id === id ? { ...server, ...updatedServer } : server,
          ),
        }));
      },

      refreshServers: async () => {
        const { servers } = get();
        set({ loading: true });

        try {
          const results = await checkMultipleServers(
            servers.map(({ id, domain, port }) => ({ id, domain, port })),
          );

          set((state) => ({
            servers: state.servers.map((server) => ({
              ...server,
              status: results[server.id].isOnline ? 'online' : 'offline',
              latency: results[server.id].latency,
            })),
          }));
        } catch (error) {
          console.error('Failed to check servers:', error);
        } finally {
          set({ loading: false });
        }
      },
    }),
    {
      name: 'servers-storage',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
); 