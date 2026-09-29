import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { createDurableStorage } from '@/services/durable-storage';
import type { Environment, HardwareSelection } from '../types';

export interface LaunchRequest {
  id: string;
  accountHash: string;
  label: string;
  environment: Environment;
  hardware: HardwareSelection;
  token: string;
  requestedAt: number;
  state: 'requesting' | 'uncertain';
  receipt?: { instanceId: string; pricePerHour?: number };
}
export const launchRequestStorage = createDurableStorage(AsyncStorage);
let hydrationError: unknown;

export const useLaunchRequestStore = create<{
  requests: LaunchRequest[];
  put: (request: LaunchRequest) => void;
  remove: (id: string) => void;
}>()(
  persist(
    (set) => ({
      requests: [],
      put: (request) =>
        set((state) => ({
          requests: [...state.requests.filter((item) => item.id !== request.id), request],
        })),
      remove: (id) => set((state) => ({ requests: state.requests.filter((item) => item.id !== id) })),
    }),
    {
      name: 'cp-launch-requests-v1',
      skipHydration: true,
      onRehydrateStorage: () => (_state, error) => {
        hydrationError = error;
      },
      storage: createJSONStorage(() => launchRequestStorage),
      partialize: ({ requests }) => ({ requests }),
    },
  ),
);

const hydration = useLaunchRequestStore.persist.rehydrate();
export async function waitForLaunchRequests() {
  await hydration;
  if (hydrationError) throw new Error('Could not load saved cloud orders. Try reopening the app before renting.');
}
