import { Node, Workflow } from '@/features/workflow/types';
import { AgentTool } from './registry';
import { WorkflowHistory } from './workflow-history';

export interface WorkflowToolsContext {
  /** Get current workflow data */
  getWorkflowData: () => Workflow;
  /** Update a single node input in the store */
  updateNodeInput: (nodeId: string, inputKey: string, value: any) => void;
  /** Restore entire workflow data (for undo) */
  restoreWorkflowData: (data: Workflow) => void;
  /** Trigger workflow generation (same as user pressing Run) */
  runWorkflow: () => void;
  /** Workflow version history */
  history: WorkflowHistory;
}

// ─── Serialization ───────────────────────────────────────────────────────────

/**
 * Infer a human-readable type string from a JS value.
 */
function inferType(value: any): string {
  if (typeof value === 'number') {
    return Number.isInteger(value) ? 'int' : 'float';
  }
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'string') {
    if (value === 'enable' || value === 'disable') return 'toggle(enable|disable)';
    return 'string';
  }
  return typeof value;
}

/**
 * Format a value for display, truncating long strings.
 */
function formatValue(value: any, maxLen: number = 120): string {
  if (typeof value === 'string') {
    if (value.length > maxLen) return `"${value.substring(0, maxLen)}..."`;
    return `"${value}"`;
  }
  return JSON.stringify(value);
}

/**
 * Serialize the workflow into a structured context string for the AI.
 * Includes parameter types so the AI knows what values to provide.
 *
 * Example output:
 *   [Node 3] KSampler ("KSampler"):
 *     - seed: int = 12345
 *     - steps: int = 20
 *     - cfg: float = 7.5
 *     - sampler_name: string = "euler"
 *     - denoise: float = 1.0
 */
export function serializeWorkflowForPrompt(data: Workflow): string {
  const sections: string[] = [];
  const sortedNodes = Object.values(data).sort(
    (a, b) => parseInt(a.id, 10) - parseInt(b.id, 10),
  );

  for (const node of sortedNodes) {
    const title = node._meta?.title || node.class_type || 'Unknown';
    const classType = node.class_type || 'Unknown';
    const params: string[] = [];

    for (const [key, value] of Object.entries(node.inputs || {})) {
      // Skip linked inputs (connections to other nodes)
      if (Array.isArray(value)) continue;
      const type = inferType(value);
      params.push(`    - ${key}: ${type} = ${formatValue(value)}`);
    }

    if (params.length > 0) {
      sections.push(`[Node ${node.id}] ${classType} ("${title}"):\n${params.join('\n')}`);
    }
  }

  return sections.join('\n\n');
}

// ─── Tools ───────────────────────────────────────────────────────────────────

/**
 * Create all workflow-related tools for the agent.
 */
export function createWorkflowTools(ctx: WorkflowToolsContext): AgentTool[] {
  // ── update_node_input ──────────────────────────────────────────────────
  const updateNodeInput: AgentTool = {
    definition: {
      type: 'function',
      function: {
        name: 'update_node_input',
        description:
          'Update a single parameter of a workflow node. Use the node ID and input key from the workflow context in the system prompt.',
        parameters: {
          type: 'object',
          properties: {
            node_id: {
              type: 'string',
              description: 'The node ID (e.g. "3", "6")',
            },
            input_key: {
              type: 'string',
              description: 'The input parameter name (e.g. "text", "steps", "cfg")',
            },
            value: {
              description:
                'The new value. Must match the parameter type: int → number, float → number, string → string, boolean → boolean, toggle → "enable" or "disable".',
            },
          },
          required: ['node_id', 'input_key', 'value'],
        },
      },
    },
    execute: async (args) => {
      const { node_id, input_key, value } = args;
      const data = ctx.getWorkflowData();
      const node = data[node_id];

      if (!node) return `Error: Node "${node_id}" not found.`;
      if (Array.isArray(node.inputs[input_key]))
        return `Error: "${input_key}" is a linked input and cannot be directly modified.`;
      if (node.inputs[input_key] === undefined)
        return `Error: Input "${input_key}" not found on node "${node_id}".`;

      // Save snapshot before modification
      const title = node._meta?.title || node.class_type || 'Unknown';
      ctx.history.push(data, `Update ${title}.${input_key}`);

      const oldValue = node.inputs[input_key];
      ctx.updateNodeInput(node_id, input_key, value);

      return `Updated [Node ${node_id}] ${title}: ${input_key} = ${formatValue(oldValue)} → ${formatValue(value)}`;
    },
  };

  // ── batch_update_nodes ─────────────────────────────────────────────────
  const batchUpdate: AgentTool = {
    definition: {
      type: 'function',
      function: {
        name: 'batch_update_nodes',
        description:
          'Update multiple node parameters at once. More efficient than calling update_node_input multiple times. A single undo will revert all changes in this batch.',
        parameters: {
          type: 'object',
          properties: {
            updates: {
              type: 'array',
              description: 'Array of updates to apply',
              items: {
                type: 'object',
                properties: {
                  node_id: { type: 'string', description: 'The node ID' },
                  input_key: { type: 'string', description: 'The input parameter name' },
                  value: { description: 'The new value (must match parameter type)' },
                },
                required: ['node_id', 'input_key', 'value'],
              },
            },
          },
          required: ['updates'],
        },
      },
    },
    execute: async (args) => {
      const { updates } = args;
      if (!Array.isArray(updates) || updates.length === 0) {
        return 'Error: No updates provided.';
      }

      const data = ctx.getWorkflowData();

      // Save a single snapshot before the entire batch
      ctx.history.push(data, `Batch update (${updates.length} changes)`);

      const results: string[] = [];
      for (const update of updates) {
        const { node_id, input_key, value } = update;
        const node = data[node_id];

        if (!node) {
          results.push(`Error: Node "${node_id}" not found.`);
          continue;
        }
        if (Array.isArray(node.inputs[input_key])) {
          results.push(`Error: "${input_key}" on node "${node_id}" is a linked input.`);
          continue;
        }

        const oldValue = node.inputs[input_key];
        ctx.updateNodeInput(node_id, input_key, value);
        const title = node._meta?.title || node.class_type || 'Unknown';
        results.push(
          `[Node ${node_id}] ${title}: ${input_key} = ${formatValue(oldValue)} → ${formatValue(value)}`,
        );
      }

      return results.join('\n');
    },
  };

  // ── run_workflow ────────────────────────────────────────────────────────
  const runWorkflow: AgentTool = {
    definition: {
      type: 'function',
      function: {
        name: 'run_workflow',
        description:
          'Trigger the workflow to generate. This is equivalent to the user pressing the "Generate" button. Call this after making parameter changes when the user wants to generate immediately.',
        parameters: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
    },
    execute: async () => {
      ctx.runWorkflow();
      return 'Workflow generation started.';
    },
  };

  // ── undo ───────────────────────────────────────────────────────────────
  const undo: AgentTool = {
    definition: {
      type: 'function',
      function: {
        name: 'undo',
        description:
          'Undo the last parameter change(s). Restores the workflow to the state before the most recent update or batch update. Can be called multiple times to undo further back.',
        parameters: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
    },
    execute: async () => {
      const snapshot = ctx.history.pop();
      if (!snapshot) {
        return 'Nothing to undo.';
      }
      ctx.restoreWorkflowData(snapshot.data);
      return `Undone: "${snapshot.description}". ${ctx.history.length} undo step(s) remaining.`;
    },
  };

  return [updateNodeInput, batchUpdate, runWorkflow, undo];
}
