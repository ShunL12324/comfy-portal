import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateUUID } from '@/utils/uuid';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { AIProvider, requiresEndpoint } from '../types';

interface AIAssistantState {
  provider: AIProvider | null;
  customPrompt: string;

  // Provider actions
  setProvider: (provider: Omit<AIProvider, 'id'>) => void;
  updateProvider: (updates: Partial<Omit<AIProvider, 'id'>>) => void;
  clearProvider: () => void;
  setCustomPrompt: (prompt: string) => void;

  // Getters
  isConfigured: () => boolean;
}

export const useAIAssistantStore = create<AIAssistantState>()(
  persist(
    (set, get) => ({
      provider: null,
      customPrompt: '',

      // Provider actions
      setProvider: (provider) => {
        set({
          provider: {
            ...provider,
            id: generateUUID(),
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

      setCustomPrompt: (prompt) => {
        set({ customPrompt: prompt });
      },

      // Getters
      isConfigured: () => {
        const provider = get().provider;
        if (!provider?.apiKey || !provider?.modelName) return false;
        // First-party providers supply their own base URL.
        return !requiresEndpoint(provider.type) || !!provider.endpointUrl;
      },
    }),
    {
      name: 'ai-assistant-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // v1 introduced `type`. Everything saved before then was reached through
      // an OpenAI-compatible endpoint, so that's what those configs are.
      version: 1,
      migrate: (persisted: any) => {
        const provider = persisted?.provider;
        if (provider && !provider.type) {
          provider.type = 'openai-compatible';
          provider.name = provider.name || 'OpenAI-compatible';
        }
        return persisted;
      },
    }
  )
);
