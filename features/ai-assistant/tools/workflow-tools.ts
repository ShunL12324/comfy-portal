import { Node, Workflow } from '@/features/workflow/types';
import * as Crypto from 'expo-crypto';
import { tool } from 'ai';
import { z } from 'zod';
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

// ─── Revisions ───────────────────────────────────────────────────────────────

/**
 * Optimistic concurrency token for a node.
 *
 * The agent reads a node, then writes it — but tools run across many steps and
 * the user is on the same screen editing the very same workflow. A write based
 * on a stale read silently clobbers whatever changed in between.
 *
 * The token is never stored anywhere: `read_workflow` hands it to the model,
 * the model hands it back on write, and we recompute and compare. That keeps
 * the workflow data structure untouched, and — since a valid token can only
 * come from a read or a prior successful write — it also enforces
 * read-before-write without any extra bookkeeping.
 */
async function nodeRev(node: Node | undefined): Promise<string> {
  const inputs = node?.inputs ?? {};
  const canonical = JSON.stringify(
    Object.keys(inputs)
      .sort()
      .map((key) => [key, inputs[key]]),
  );
  const digest = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, canonical);
  return digest.slice(0, 8);
}

/** Full, untruncated view of a node — what the model composes edits from. */
async function describeNode(node: Node) {
  const editable: Record<string, unknown> = {};
  const linked: string[] = [];
  for (const [key, value] of Object.entries(node.inputs ?? {})) {
    if (Array.isArray(value)) linked.push(key);
    else editable[key] = value;
  }
  return {
    node_id: node.id,
    title: node._meta?.title || node.class_type || 'Unknown',
    class_type: node.class_type,
    rev: await nodeRev(node),
    inputs: editable,
    linked_inputs: linked,
  };
}

// ─── Serialization ───────────────────────────────────────────────────────────

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
function coerceValue(newValue: any, oldValue: any): { value: any; error?: string } {
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
    if (oldValue === 'enable' || oldValue === 'disable') {
      const str = String(newValue).toLowerCase();
      if (str === 'enable' || str === 'disable') return { value: str };
      if (str === 'true' || str === '1' || str === 'on') return { value: 'enable' };
      if (str === 'false' || str === '0' || str === 'off') return { value: 'disable' };
      return {
        value: newValue,
        error: `Toggle parameter only accepts "enable" or "disable", got "${newValue}".`,
      };
    }
    return { value: String(newValue) };
  }

  return { value: newValue };
}

/**
 * Compact index of the workflow for the system prompt.
 *
 * Deliberately carries no values: an earlier version inlined them and truncated
 * long strings to 120 chars, so the model rewrote prompts from a mangled stub
 * and destroyed the rest. Values come from `read_workflow` instead.
 */
export function serializeWorkflowIndex(data: Workflow): string {
  const sortedNodes = Object.values(data).sort(
    (a, b) => parseInt(a.id, 10) - parseInt(b.id, 10),
  );

  return sortedNodes
    .map((node) => {
      const title = node._meta?.title || node.class_type || 'Unknown';
      const classType = node.class_type || 'Unknown';
      const keys = Object.entries(node.inputs ?? {})
        .filter(([, value]) => !Array.isArray(value))
        .map(([key, value]) => `${key}: ${inferType(value)}`);
      return `[Node ${node.id}] ${classType} ("${title}") — ${keys.join(', ') || 'no editable inputs'}`;
    })
    .join('\n');
}

// ─── Tools ───────────────────────────────────────────────────────────────────

/** Workflow input values are always primitives; links are not editable. */
const valueSchema = z.union([z.string(), z.number(), z.boolean()]);

export function createWorkflowTools(ctx: WorkflowToolsContext) {
  /** Shared guard for a single write. Returns an error string, or the coerced value. */
  async function validateWrite(
    data: Workflow,
    node_id: string,
    input_key: string,
    value: unknown,
    rev: string,
  ): Promise<{ error: string } | { node: Node; oldValue: any; newValue: any; title: string }> {
    const node = data[node_id];
    if (!node) return { error: `Node "${node_id}" not found.` };

    const currentRev = await nodeRev(node);
    if (currentRev !== rev) {
      // Hand back the current state so the model can retry immediately
      // instead of spending another round trip on a re-read.
      return {
        error:
          `Node "${node_id}" changed since you read it (expected rev ${rev}, now ${currentRev}). ` +
          `Your edit was NOT applied. Current state: ${JSON.stringify(await describeNode(node))}`,
      };
    }

    if (Array.isArray(node.inputs[input_key]))
      return { error: `"${input_key}" is a linked input and cannot be directly modified.` };
    if (node.inputs[input_key] === undefined)
      return { error: `Input "${input_key}" not found on node "${node_id}".` };

    const oldValue = node.inputs[input_key];
    const coerced = coerceValue(value, oldValue);
    if (coerced.error) return { error: `${coerced.error} (node "${node_id}", input "${input_key}")` };

    return {
      node,
      oldValue,
      newValue: coerced.value,
      title: node._meta?.title || node.class_type || 'Unknown',
    };
  }

  const read_workflow = tool({
    description:
      'Read workflow nodes. Omit node_id to list every node with its editable input names and types. ' +
      'Pass node_id to get that node\'s full, untruncated input values. ' +
      'You MUST read a node before editing it — the returned `rev` is required by the edit tools.',
    inputSchema: z.object({
      node_id: z
        .string()
        .optional()
        .describe('Node ID to inspect in full. Omit to list all nodes.'),
    }),
    execute: async ({ node_id }) => {
      const data = ctx.getWorkflowData();

      if (node_id) {
        const node = data[node_id];
        if (!node) return `Error: Node "${node_id}" not found.`;
        return JSON.stringify(await describeNode(node), null, 2);
      }

      const nodes = await Promise.all(
        Object.values(data)
          .sort((a, b) => parseInt(a.id, 10) - parseInt(b.id, 10))
          .map(describeNode),
      );
      // The list omits values to stay small; read a specific node for those.
      return JSON.stringify(
        nodes.map(({ inputs, ...rest }) => ({ ...rest, input_keys: Object.keys(inputs) })),
        null,
        2,
      );
    },
  });

  const update_node_input = tool({
    description:
      'Update a single parameter of a workflow node. Requires the `rev` returned by read_workflow ' +
      '(or by a previous successful edit of the same node).',
    inputSchema: z.object({
      node_id: z.string().describe('The node ID (e.g. "3", "6")'),
      input_key: z.string().describe('The input parameter name (e.g. "text", "steps", "cfg")'),
      value: valueSchema.describe(
        'The new value. Must match the parameter type: int/float → number, string → string, ' +
          'boolean → boolean, toggle → "enable" or "disable".',
      ),
      rev: z.string().describe('The node revision from your most recent read or edit.'),
    }),
    execute: async ({ node_id, input_key, value, rev }) => {
      const data = ctx.getWorkflowData();
      const checked = await validateWrite(data, node_id, input_key, value, rev);
      if ('error' in checked) return `Error: ${checked.error}`;

      const { oldValue, newValue, title } = checked;
      ctx.history.push(data, `Update ${title}.${input_key}`);
      ctx.updateNodeInput(node_id, input_key, newValue);

      // Return the new rev so consecutive edits to this node don't need a re-read.
      const nextRev = await nodeRev(ctx.getWorkflowData()[node_id]);
      return (
        `Updated [Node ${node_id}] ${title}: ${input_key} = ${JSON.stringify(oldValue)} → ` +
        `${JSON.stringify(newValue)}. New rev: ${nextRev}`
      );
    },
  });

  const batch_update_nodes = tool({
    description:
      'Update multiple node parameters at once. More efficient than repeated update_node_input, ' +
      'and a single undo reverts the whole batch. Each entry needs its own node `rev`.',
    inputSchema: z.object({
      updates: z
        .array(
          z.object({
            node_id: z.string().describe('The node ID'),
            input_key: z.string().describe('The input parameter name'),
            value: valueSchema.describe('The new value (must match parameter type)'),
            rev: z.string().describe('That node\'s revision from your most recent read or edit.'),
          }),
        )
        .min(1)
        .describe('Updates to apply'),
    }),
    execute: async ({ updates }) => {
      const data = ctx.getWorkflowData();

      // Pre-validate everything before touching the undo stack, so a partly
      // invalid batch can't leave a snapshot that doesn't match reality.
      const validated: {
        node_id: string;
        input_key: string;
        oldValue: any;
        newValue: any;
        title: string;
      }[] = [];
      const errors: string[] = [];

      for (const { node_id, input_key, value, rev } of updates) {
        const checked = await validateWrite(data, node_id, input_key, value, rev);
        if ('error' in checked) {
          errors.push(`Error: ${checked.error}`);
          continue;
        }
        validated.push({
          node_id,
          input_key,
          oldValue: checked.oldValue,
          newValue: checked.newValue,
          title: checked.title,
        });
      }

      if (validated.length > 0) {
        ctx.history.push(data, `Batch update (${validated.length} changes)`);
      }

      const results: string[] = [...errors];
      for (const { node_id, input_key, oldValue, newValue, title } of validated) {
        ctx.updateNodeInput(node_id, input_key, newValue);
        results.push(
          `[Node ${node_id}] ${title}: ${input_key} = ${JSON.stringify(oldValue)} → ${JSON.stringify(newValue)}`,
        );
      }

      // Fresh revs for every node touched, so follow-up edits don't need a re-read.
      const after = ctx.getWorkflowData();
      const touched = [...new Set(validated.map((v) => v.node_id))];
      const revs = await Promise.all(
        touched.map(async (id) => `${id}=${await nodeRev(after[id])}`),
      );
      if (revs.length > 0) results.push(`New revs: ${revs.join(', ')}`);

      return results.join('\n');
    },
  });

  const run_workflow = tool({
    description:
      'Trigger the workflow to generate. Equivalent to the user pressing "Generate". ' +
      'Call this after making changes when the user wants to generate immediately.',
    inputSchema: z.object({}),
    execute: async () => {
      ctx.runWorkflow();
      return 'Workflow generation started.';
    },
  });

  const undo = tool({
    description:
      'Undo the last parameter change(s). Restores the workflow to the state before the most ' +
      'recent update or batch update. Can be called repeatedly to undo further back.',
    inputSchema: z.object({}),
    execute: async () => {
      const snapshot = ctx.history.pop();
      if (!snapshot) return 'Nothing to undo.';
      ctx.restoreWorkflowData(snapshot.data);
      // Revisions changed wholesale; the model must re-read before editing again.
      return (
        `Undone: "${snapshot.description}". ${ctx.history.length} undo step(s) remaining. ` +
        `Node revisions have changed — read_workflow again before further edits.`
      );
    },
  });

  return { read_workflow, update_node_input, batch_update_nodes, run_workflow, undo };
}

export type WorkflowTools = ReturnType<typeof createWorkflowTools>;
