import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateUUID } from '@/utils/uuid';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { AIProvider } from '../types';

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
        return !!(provider?.endpointUrl && provider?.apiKey && provider?.modelName);
      },
    }),
    {
      name: 'ai-assistant-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
