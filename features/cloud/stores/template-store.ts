import { generateUUID } from '@/utils/uuid';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { GpuTemplate } from '../types';

/**
 * Provisioning templates.
 *
 * AsyncStorage rather than the keychain: these hold model URLs and workflow
 * JSON, which aren't secrets, and a workflow is far larger than the keychain's
 * practical per-item limit.
 */
interface TemplateState {
  templates: GpuTemplate[];
  addTemplate: (template: Omit<GpuTemplate, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateTemplate: (id: string, updates: Partial<Omit<GpuTemplate, 'id' | 'createdAt'>>) => void;
  removeTemplate: (id: string) => void;
  duplicateTemplate: (id: string) => string | null;
  getTemplate: (id: string) => GpuTemplate | undefined;
}

export const useTemplateStore = create<TemplateState>()(
  persist(
    (set, get) => ({
      templates: [],

      addTemplate: (template) => {
        const now = new Date().toISOString();
        const created: GpuTemplate = { ...template, id: generateUUID(), createdAt: now, updatedAt: now };
        set((state) => ({ templates: [...state.templates, created] }));
        return created.id;
      },

      updateTemplate: (id, updates) =>
        set((state) => ({
          templates: state.templates.map((t) =>
            t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t,
          ),
        })),

      removeTemplate: (id) =>
        set((state) => ({ templates: state.templates.filter((t) => t.id !== id) })),

      duplicateTemplate: (id) => {
        const source = get().templates.find((t) => t.id === id);
        if (!source) return null;
        return get().addTemplate({
          ...source,
          name: `${source.name} copy`,
        });
      },

      getTemplate: (id) => get().templates.find((t) => t.id === id),
    }),
    {
      name: 'gpu-templates',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
