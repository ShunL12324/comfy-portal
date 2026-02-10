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
 * Coerce and validate a new value against the original value's type.
 * Returns { value, error } — if error is set, the value is invalid.
 */
function coerceValue(
  newValue: any,
  oldValue: any,
): { value: any; error?: string } {
  const oldType = typeof oldValue;

  // number (int or float)
  if (oldType === 'number') {
    if (typeof newValue === 'number') {
      if (!isFinite(newValue)) return { value: newValue, error: 'Value must be a finite number.' };
      // Preserve int vs float: if original was int, round the new value
      return { value: Number.isInteger(oldValue) ? Math.round(newValue) : newValue };
    }
    if (typeof newValue === 'string') {
      const parsed = Number(newValue);
      if (isNaN(parsed)) return { value: newValue, error: `Cannot convert "${newValue}" to a number.` };
      return { value: Number.isInteger(oldValue) ? Math.round(parsed) : parsed };
    }
    return { value: newValue, error: `Expected a number but got ${typeof newValue}.` };
  }

  // boolean
  if (oldType === 'boolean') {
    if (typeof newValue === 'boolean') return { value: newValue };
    if (newValue === 'true') return { value: true };
    if (newValue === 'false') return { value: false };
    if (typeof newValue === 'number') return { value: newValue !== 0 };
    return { value: newValue, error: `Expected a boolean but got ${typeof newValue} "${newValue}".` };
  }

  // string — including "enable"/"disable" toggle
  if (oldType === 'string') {
    // toggle validation
    if (oldValue === 'enable' || oldValue === 'disable') {
      const str = String(newValue).toLowerCase();
      if (str === 'enable' || str === 'disable') return { value: str };
      if (str === 'true' || str === '1' || str === 'on') return { value: 'enable' };
      if (str === 'false' || str === '0' || str === 'off') return { value: 'disable' };
      return { value: newValue, error: `Toggle parameter only accepts "enable" or "disable", got "${newValue}".` };
    }
    // regular string — coerce anything to string
    return { value: String(newValue) };
  }

  // unknown type — pass through
  return { value: newValue };
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

      const title = node._meta?.title || node.class_type || 'Unknown';
      const oldValue = node.inputs[input_key];

      // Validate & coerce before saving snapshot
      const coerced = coerceValue(value, oldValue);
      if (coerced.error) {
        return `Error: ${coerced.error} (node "${node_id}", input "${input_key}")`;
      }

      // Save snapshot before modification
      ctx.history.push(data, `Update ${title}.${input_key}`);
      ctx.updateNodeInput(node_id, input_key, coerced.value);

      return `Updated [Node ${node_id}] ${title}: ${input_key} = ${formatValue(oldValue)} → ${formatValue(coerced.value)}`;
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

      // Pre-validate all updates before saving snapshot
      const validated: {
        node_id: string;
        input_key: string;
        oldValue: any;
        newValue: any;
        title: string;
      }[] = [];
      const errors: string[] = [];

      for (const update of updates) {
        const { node_id, input_key, value } = update;
        const node = data[node_id];

        if (!node) {
          errors.push(`Error: Node "${node_id}" not found.`);
          continue;
        }
        if (Array.isArray(node.inputs[input_key])) {
          errors.push(`Error: "${input_key}" on node "${node_id}" is a linked input.`);
          continue;
        }

        const oldValue = node.inputs[input_key];
        const coerced = coerceValue(value, oldValue);
        if (coerced.error) {
          errors.push(`Error: ${coerced.error} (node "${node_id}", input "${input_key}")`);
          continue;
        }

        const title = node._meta?.title || node.class_type || 'Unknown';
        validated.push({ node_id, input_key, oldValue, newValue: coerced.value, title });
      }

      // Only save snapshot if at least one update is valid
      if (validated.length > 0) {
        ctx.history.push(data, `Batch update (${validated.length} changes)`);
      }

      // Apply validated updates
      const results: string[] = [...errors];
      for (const { node_id, input_key, oldValue, newValue, title } of validated) {
        ctx.updateNodeInput(node_id, input_key, newValue);
        results.push(
          `[Node ${node_id}] ${title}: ${input_key} = ${formatValue(oldValue)} → ${formatValue(newValue)}`,
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
