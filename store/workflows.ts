import { Workflow } from "@/types/workflow";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface WorkflowState {
  workflows: Workflow[];
  addWorkflow: (workflow: Workflow) => void;
  removeWorkflow: (id: string) => void;
  updateWorkflow: (id: string, updates: Partial<Workflow>) => void;
}

export const useWorkflowsStore = create<WorkflowState>()(
  persist(
    (set) => ({
      workflows: [],

      addWorkflow: (workflow) => {
        set((state) => ({
          workflows: [...state.workflows, workflow],
        }));
      },

      removeWorkflow: (id) => {
        set((state) => ({
          workflows: state.workflows.filter((w) => w.id !== id),
        }));
      },

      updateWorkflow: (id, updates) => {
        set((state) => ({
          workflows: state.workflows.map((w) => (w.id === id ? { ...w, ...updates } : w)),
        }));
      },
    }),
    {
      name: 'workflows',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
