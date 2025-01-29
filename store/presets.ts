import { Preset } from '@/types/preset';
import { cleanupPresetData } from '@/utils/image-storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface PresetsState {
  presets: Preset[];
  addPreset: (preset: Omit<Preset, 'id' | 'createdAt'>) => void;
  removePreset: (id: string) => void;
  updatePreset: (id: string, updates: Partial<Omit<Preset, 'id'>>) => void;
  updateUsage: (id: string) => void;
}

export const usePresetsStore = create<PresetsState>()(
  persist(
    (set) => ({
      presets: [],

      addPreset: (preset) => {
        const newPreset: Preset = {
          ...preset,
          id: Crypto.randomUUID(),
          createdAt: Date.now(),
        };
        set((state) => ({
          presets: [...state.presets, newPreset],
        }));
      },

      removePreset: (id) =>
        set((state) => {
          const preset = state.presets.find((p) => p.id === id);
          if (preset) {
            // Clean up preset data
            cleanupPresetData(preset.serverId, id).catch(console.error);
          }
          return {
            presets: state.presets.filter((p) => p.id !== id),
          };
        }),

      updatePreset: (id, updates) =>
        set((state) => ({
          presets: state.presets.map((p) =>
            p.id === id ? { ...p, ...updates } : p,
          ),
        })),

      updateUsage: (id) =>
        set((state) => ({
          presets: state.presets.map((p) =>
            p.id === id ? { ...p, lastUsed: Date.now() } : p
          ),
        })),
    }),
    {
      name: 'presets-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
); 