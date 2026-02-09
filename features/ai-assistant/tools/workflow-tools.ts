import { Node } from '@/features/workflow/types';
import { AgentTool } from './registry';

interface WorkflowToolsContext {
  /** Current workflow data */
  getWorkflowData: () => Record<string, Node>;
  /** Update a node input */
  updateNodeInput: (nodeId: string, inputKey: string, value: any) => void;
}

/**
 * Serialize workflow into a readable string for the AI.
 * Filters out linked inputs (arrays = node connections).
 */
function serializeWorkflow(data: Record<string, Node>): string {
  const lines: string[] = [];
  const sortedNodes = Object.values(data).sort(
    (a, b) => parseInt(a.id, 10) - parseInt(b.id, 10),
  );

  for (const node of sortedNodes) {
    const title = node._meta?.title || node.class_type || 'Unknown';
    const classType = node.class_type || 'Unknown';
    const editableInputs: string[] = [];

    for (const [key, value] of Object.entries(node.inputs || {})) {
      if (Array.isArray(value)) continue; // skip linked inputs
      if (typeof value === 'string' && value.length > 200) {
        editableInputs.push(`${key}="${value.substring(0, 200)}..."`);
      } else if (typeof value === 'string') {
        editableInputs.push(`${key}="${value}"`);
      } else {
        editableInputs.push(`${key}=${JSON.stringify(value)}`);
      }
    }

    if (editableInputs.length > 0) {
      lines.push(`[Node ${node.id}] ${classType} ("${title}"): ${editableInputs.join(', ')}`);
    }
  }

  return lines.join('\n');
}

/**
 * Create all workflow-related tools for the agent.
 */
export function createWorkflowTools(ctx: WorkflowToolsContext): AgentTool[] {
  const getWorkflowState: AgentTool = {
    definition: {
      type: 'function',
      function: {
        name: 'get_workflow_state',
        description:
          'Get the current workflow state including all nodes and their editable parameters. Call this first to understand what nodes and parameters are available before making changes.',
        parameters: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
    },
    execute: async () => {
      const data = ctx.getWorkflowData();
      const serialized = serializeWorkflow(data);
      return serialized || 'Workflow is empty.';
    },
  };

  const updateNodeInput: AgentTool = {
    definition: {
      type: 'function',
      function: {
        name: 'update_node_input',
        description:
          'Update a single parameter of a node in the workflow. Use the node ID and input key from get_workflow_state.',
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
              description: 'The new value to set. Can be string, number, or boolean.',
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
      if (!node) {
        return `Error: Node "${node_id}" not found.`;
      }
      if (Array.isArray(node.inputs[input_key])) {
        return `Error: "${input_key}" is a linked input and cannot be directly modified.`;
      }
      if (node.inputs[input_key] === undefined) {
        return `Error: Input "${input_key}" not found on node "${node_id}".`;
      }

      const oldValue = node.inputs[input_key];
      ctx.updateNodeInput(node_id, input_key, value);
      const title = node._meta?.title || node.class_type || 'Unknown';
      return `Updated [Node ${node_id}] ${title}: ${input_key} changed from ${JSON.stringify(oldValue)} to ${JSON.stringify(value)}`;
    },
  };

  const batchUpdate: AgentTool = {
    definition: {
      type: 'function',
      function: {
        name: 'batch_update_nodes',
        description:
          'Update multiple node parameters at once. More efficient than calling update_node_input multiple times.',
        parameters: {
          type: 'object',
          properties: {
            updates: {
              type: 'array',
              description: 'Array of updates to apply',
              items: {
                type: 'object',
                properties: {
                  node_id: {
                    type: 'string',
                    description: 'The node ID',
                  },
                  input_key: {
                    type: 'string',
                    description: 'The input parameter name',
                  },
                  value: {
                    description: 'The new value',
                  },
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
        results.push(`[Node ${node_id}] ${title}: ${input_key} = ${JSON.stringify(oldValue)} → ${JSON.stringify(value)}`);
      }

      return results.join('\n');
    },
  };

  return [getWorkflowState, updateNodeInput, batchUpdate];
}
