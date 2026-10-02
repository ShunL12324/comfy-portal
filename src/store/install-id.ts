import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateUUID } from '@/utils/uuid';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface InstallIdState {
  /**
   * Stable per-install identifier.
   *
   * Prefix of every ComfyUI WebSocket clientId. It must be unique per
   * device: the server keys its socket registry by clientId and evicts the
   * previous socket when a new one connects with the same id, so two devices
   * sharing an id would silently kick each other offline. Each connection
   * appends its own suffix (see `ComfyClient.rotateClientId`).
   */
  installId: string;
}

export const useInstallIdStore = create<InstallIdState>()(
  persist(
    () => ({
      installId: generateUUID(),
    }),
    {
      name: 'install-id-storage',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

// `persist` only writes through its wrapped `set`, and this store has no
// actions — so without an explicit write the generated id would never reach
// storage and would be different on every cold start. Re-setting the current
// value once hydration settles commits whichever id we ended up with.
useInstallIdStore.persist.onFinishHydration(() => {
  useInstallIdStore.setState((state) => ({ installId: state.installId }));
});

/** Read the install id outside of React. */
export function getInstallId() {
  return useInstallIdStore.getState().installId;
}
