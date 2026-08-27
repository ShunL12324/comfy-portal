import { secureStorage } from '@/services/secure-store';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/**
 * Credentials for renting GPUs and downloading models.
 *
 * Kept apart from every other store because these live in the OS keychain —
 * the vast key in particular can spend the user's money, so it must not sit in
 * plaintext AsyncStorage alongside UI preferences.
 */
export interface CloudCredentials {
  /** vast.ai API key — rents and destroys instances. */
  vastApiKey: string;
  /** Sent to the instance so gated Civitai downloads work. */
  civitaiApiKey: string;
  /** Sent to the instance so gated HuggingFace repos resolve. */
  huggingFaceToken: string;
}

interface CloudCredentialsState extends CloudCredentials {
  /** False until the keychain read finishes — screens should wait on it. */
  hydrated: boolean;
  setCredential: <K extends keyof CloudCredentials>(key: K, value: string) => void;
  clearAll: () => void;
  hasVastKey: () => boolean;
}

export const useCloudCredentialsStore = create<CloudCredentialsState>()(
  persist(
    (set, get) => ({
      vastApiKey: '',
      civitaiApiKey: '',
      huggingFaceToken: '',
      hydrated: false,

      setCredential: (key, value) => set({ [key]: value.trim() } as Pick<CloudCredentials, typeof key>),

      clearAll: () => set({ vastApiKey: '', civitaiApiKey: '', huggingFaceToken: '' }),

      hasVastKey: () => get().vastApiKey.length > 0,
    }),
    {
      name: 'cloud-credentials',
      storage: createJSONStorage(() => secureStorage),
      // `hydrated` describes this session, not the saved value.
      partialize: ({ vastApiKey, civitaiApiKey, huggingFaceToken }) => ({
        vastApiKey,
        civitaiApiKey,
        huggingFaceToken,
      }),
      // Reading the keychain is async, and screens need to tell "no key yet"
      // apart from "still loading" — otherwise the settings form flashes empty
      // and an eager launch check reports the key missing.
      onRehydrateStorage: () => () => {
        useCloudCredentialsStore.setState({ hydrated: true });
      },
    },
  ),
);
