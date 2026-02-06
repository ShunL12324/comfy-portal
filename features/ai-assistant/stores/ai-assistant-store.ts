import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { AIProvider, PromptTemplate } from '../types';

const DEFAULT_TEMPLATES: PromptTemplate[] = [
  {
    id: 'enhance-description',
    name: 'Enhance Description',
    systemPrompt: `You are an expert at enhancing image generation prompts for Stable Diffusion and similar AI image generators.

Your task is to take the user's prompt and enhance it with more vivid, detailed descriptions while preserving the original intent.

Rules:
1. Add descriptive details about lighting, atmosphere, style, and composition
2. Keep the core subject and concept from the original prompt
3. Use comma-separated tags/phrases common in image generation
4. Output in the same language as the input prompt
5. Do not add explanations, just output the enhanced prompt directly

User's prompt:
{{user_prompt}}`,
    isBuiltIn: false,
    createdAt: new Date('2024-01-01'),
  },
];

interface AIAssistantState {
  provider: AIProvider | null;
  templates: PromptTemplate[];
  selectedTemplateId: string | null;

  // Provider actions
  setProvider: (provider: Omit<AIProvider, 'id'>) => void;
  updateProvider: (updates: Partial<Omit<AIProvider, 'id'>>) => void;
  clearProvider: () => void;

  // Template actions
  addTemplate: (template: Omit<PromptTemplate, 'id' | 'createdAt' | 'isBuiltIn'>) => void;
  updateTemplate: (id: string, updates: Partial<Omit<PromptTemplate, 'id' | 'isBuiltIn' | 'createdAt'>>) => void;
  removeTemplate: (id: string) => void;
  setSelectedTemplate: (id: string | null) => void;

  // Getters
  getSelectedTemplate: () => PromptTemplate | undefined;
  isConfigured: () => boolean;
}

export const useAIAssistantStore = create<AIAssistantState>()(
  persist(
    (set, get) => ({
      provider: null,
      templates: DEFAULT_TEMPLATES,
      selectedTemplateId: 'enhance-description',

      // Provider actions
      setProvider: (provider) => {
        set({
          provider: {
            ...provider,
            id: Crypto.randomUUID(),
          },
        });
      },

      updateProvider: (updates) => {
        const currentProvider = get().provider;
        if (!currentProvider) return;
        set({
          provider: {
            ...currentProvider,
            ...updates,
          },
        });
      },

      clearProvider: () => {
        set({ provider: null });
      },

      // Template actions
      addTemplate: (template) => {
        const newTemplate: PromptTemplate = {
          ...template,
          id: Crypto.randomUUID(),
          isBuiltIn: false,
          createdAt: new Date(),
        };
        set((state) => ({
          templates: [...state.templates, newTemplate],
        }));
      },

      updateTemplate: (id, updates) => {
        set((state) => ({
          templates: state.templates.map((t) =>
            t.id === id ? { ...t, ...updates } : t
          ),
        }));
      },

      removeTemplate: (id) => {
        set((state) => ({
          templates: state.templates.filter((t) => t.id !== id),
          selectedTemplateId:
            state.selectedTemplateId === id ? state.templates[0]?.id ?? null : state.selectedTemplateId,
        }));
      },

      setSelectedTemplate: (id) => {
        set({ selectedTemplateId: id });
      },

      // Getters
      getSelectedTemplate: () => {
        const state = get();
        return state.templates.find((t) => t.id === state.selectedTemplateId);
      },

      isConfigured: () => {
        const provider = get().provider;
        return !!(provider?.endpointUrl && provider?.apiKey && provider?.modelName);
      },
    }),
    {
      name: 'ai-assistant-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
