import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  tags?: string[];
  content: string;
  serverId: string;
}

interface WorkflowsState {
  workflows: Workflow[];
  loading: boolean;
  addWorkflow: (workflow: Omit<Workflow, 'id'>) => void;
  removeWorkflow: (id: string) => void;
  updateWorkflow: (id: string, workflow: Partial<Workflow>) => void;
}

export const useWorkflowsStore = create<WorkflowsState>((set) => ({
  workflows: [
    {
      id: '1',
      name: 'Default Workflow',
      description: 'A basic workflow example',
      tags: ['basic', 'example'],
      content: '{}',
      serverId: '1'
    }
  ],
  loading: false,

  addWorkflow: (workflow) =>
    set((state) => ({
      workflows: [...state.workflows, { ...workflow, id: Date.now().toString() }],
    })),

  removeWorkflow: (id) =>
    set((state) => ({
      workflows: state.workflows.filter((w) => w.id !== id),
    })),

  updateWorkflow: (id, workflow) =>
    set((state) => ({
      workflows: state.workflows.map((w) =>
        w.id === id ? { ...w, ...workflow } : w
      ),
    })),
})); 