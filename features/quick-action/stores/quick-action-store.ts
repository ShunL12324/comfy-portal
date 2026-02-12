import { QuickAction } from '@/features/quick-action/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateUUID } from '@/utils/uuid';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface QuickActionState {
  actions: QuickAction[];
  addAction: (action: Omit<QuickAction, 'id' | 'createdAt'>) => void;
  removeAction: (id: string) => void;
  updateAction: (id: string, updates: Partial<Omit<QuickAction, 'id' | 'createdAt'>>) => void;
}

export const useQuickActionStore = create<QuickActionState>()(
  persist(
    (set) => ({
      actions: [],

      addAction: (action) => {
        const newAction: QuickAction = {
          ...action,
          id: generateUUID(),
          createdAt: Date.now(),
        };
        set((state) => ({
          actions: [...state.actions, newAction],
        }));
      },

      removeAction: (id) =>
        set((state) => ({
          actions: state.actions.filter((a) => a.id !== id),
        })),

      updateAction: (id, updates) =>
        set((state) => ({
          actions: state.actions.map((a) =>
            a.id === id ? { ...a, ...updates } : a,
          ),
        })),
    }),
    {
      name: 'quick-action-storage',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
