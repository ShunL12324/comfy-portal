import { WorkflowRecord } from '@/types/workflow';
import { cleanupWorkflowData } from '@/utils/image-storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface WorkflowStoreState {
  workflow: WorkflowRecord[];
  addWorkflow: (preset: Omit<WorkflowRecord, 'id' | 'createdAt'>) => void;
  removeWorkflow: (id: string) => void;
  updateWorkflow: (id: string, updates: Partial<Omit<WorkflowRecord, 'id'>>) => void;
  updateUsage: (id: string) => void;
  updateNodeInput: (workflowId: string, nodeId: string, inputKey: string, value: any) => void;
}

export const useWorkflowStore = create<WorkflowStoreState>()(
  persist(
    (set) => ({
      workflow: [],

      addWorkflow: (workflow) => {
        const newWorkflow: WorkflowRecord = {
          ...workflow,
          id: Crypto.randomUUID(),
          createdAt: new Date(),
        };
        set((state) => ({
          workflow: [...state.workflow, newWorkflow],
        }));
      },

      removeWorkflow: (id) =>
        set((state) => {
          const workflow = state.workflow.find((p) => p.id === id);
          if (workflow) {
            // Clean up preset data
            cleanupWorkflowData(workflow.serverId, id).catch(console.error);
          }
          return {
            workflow: state.workflow.filter((p) => p.id !== id),
          };
        }),

      updateWorkflow: (id, updates) =>
        set((state) => ({
          workflow: state.workflow.map((p) =>
            p.id === id ? { ...p, ...updates } : p,
          ),
        })),

      updateUsage: (id) =>
        set((state) => ({
          workflow: state.workflow.map((p) =>
            p.id === id ? { ...p, lastUsed: new Date() } : p,
          ),
        })),

      updateNodeInput: (workflowId, nodeId, inputKey, value) =>
        set((state) => ({
          workflow: state.workflow.map((workflow) => {
            if (workflow.id !== workflowId) return workflow;

            const node = workflow.data[nodeId];
            if (!node) return workflow;

            return {
              ...workflow,
              data: {
                ...workflow.data,
                [nodeId]: {
                  ...node,
                  inputs: {
                    ...node.inputs,
                    [inputKey]: value,
                  },
                },
              },
            };
          }),
        })),
    }),
    {
      name: 'workflows-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
); 