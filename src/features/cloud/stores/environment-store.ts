import { generateUUID } from '@/utils/uuid';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Environment } from '../types';
import { environmentContentSchema } from '../utils/environment-io';
import { uniqueCopyName } from '@/features/workflow/utils/copy-name';

/**
 * Provisioning environments.
 *
 * AsyncStorage rather than the keychain: these hold model URLs and workflow
 * JSON, which aren't secrets, and a workflow is far larger than the keychain's
 * practical per-item limit.
 */
interface EnvironmentState {
  environments: Environment[];
  /** Built-in example ids already added to the list, so a deleted example stays deleted. */
  seededExamples: string[];
  markExamplesSeeded: (ids: string[]) => void;
  addEnvironment: (template: Omit<Environment, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateEnvironment: (id: string, updates: Partial<Omit<Environment, 'id' | 'createdAt'>>) => void;
  removeEnvironment: (id: string) => void;
  duplicateEnvironment: (id: string) => string | null;
  getEnvironment: (id: string) => Environment | undefined;
}

export const useEnvironmentStore = create<EnvironmentState>()(
  persist(
    (set, get) => ({
      environments: [],
      seededExamples: [],
      markExamplesSeeded: (ids) =>
        set((state) => ({ seededExamples: Array.from(new Set([...state.seededExamples, ...ids])) })),

      addEnvironment: (template) => {
        const now = new Date().toISOString();
        const created: Environment = {
          ...environmentContentSchema.parse(template),
          id: generateUUID(),
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({ environments: [...state.environments, created] }));
        return created.id;
      },

      updateEnvironment: (id, updates) =>
        set((state) => ({
          environments: state.environments.map((t) =>
            t.id === id
              ? { ...t, ...environmentContentSchema.parse({ ...t, ...updates }), updatedAt: new Date().toISOString() }
              : t,
          ),
        })),

      removeEnvironment: (id) => set((state) => ({ environments: state.environments.filter((t) => t.id !== id) })),

      duplicateEnvironment: (id) => {
        const source = get().environments.find((t) => t.id === id);
        if (!source) return null;
        return get().addEnvironment({
          ...source,
          name: uniqueCopyName(
            source.name,
            get().environments.map((item) => item.name),
          ),
        });
      },

      getEnvironment: (id) => get().environments.find((t) => t.id === id),
    }),
    {
      name: 'cp-environments-v2',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

const subscribeHydration = (notify: () => void) => {
  const start = useEnvironmentStore.persist.onHydrate(notify);
  const finish = useEnvironmentStore.persist.onFinishHydration(notify);
  return () => {
    start();
    finish();
  };
};
export function useEnvironmentsHydrated() {
  return useSyncExternalStore(subscribeHydration, useEnvironmentStore.persist.hasHydrated, () => false);
}
