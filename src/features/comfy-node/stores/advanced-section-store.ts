import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface AdvancedSectionState {
  /** `workflowId/nodeId` of every node whose Advanced section is open. Collapsed is the default, so only opens are kept. */
  open: Record<string, true>;
  setOpen: (key: string, open: boolean) => void;
}

/**
 * Which nodes have their Advanced section expanded.
 *
 * This is how the user likes to see the editor, not part of the workflow, so
 * it lives here rather than in the workflow graph, where it would change the
 * saved file and the prompt.
 */
export const useAdvancedSectionStore = create<AdvancedSectionState>()(
  persist(
    (set) => ({
      open: {},
      setOpen: (key, open) =>
        set((state) => {
          if (open === (state.open[key] === true)) return state;
          const next = { ...state.open };
          if (open) next[key] = true;
          else delete next[key];
          return { open: next };
        }),
    }),
    {
      name: 'comfy-node-advanced-sections',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ open: state.open }),
    },
  ),
);

export function advancedSectionKey(workflowId: string, nodeId: string) {
  return `${workflowId}/${nodeId}`;
}
