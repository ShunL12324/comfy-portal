import type { SchemaFieldProps } from '@/features/comfy-node/components/node/common/schema-field';
import { isChangedFromDefault, pickFieldSpec } from '@/features/comfy-node/utils/schema-inputs';
import type { Node } from '@/features/workflow/types';
import { NodeSchema, resolveInputSpec } from '@/services/node-schema';

/** One entry in a schema-driven editor: which input, under what title, rendered how. */
export type SchemaFieldDef = Omit<SchemaFieldProps, 'node' | 'workflowId' | 'serverId' | 'schema'> & {
  /** Hide the field when another input makes it irrelevant. */
  visible?: (inputs: Node['inputs']) => boolean;
  /**
   * File the field under the node's collapsed Advanced section. Defaults to
   * the server's own `advanced` flag; set it to decide regardless of what the
   * server says (or before it has said anything).
   */
  advanced?: boolean;
  /** Share a row with a second number input of the same kind and units, e.g. Width × Height. */
  pairedWith?: {
    inputKey: string;
    /** The second input's title when the two can't share a row (one is linked). */
    title: string;
    /** The shared row's title. */
    rowTitle: string;
    swappable?: boolean;
  };
};

/** The workflow inputs a field shows: its own, and its pair's. */
export function fieldInputKeys(field: SchemaFieldDef): string[] {
  return field.pairedWith ? [field.inputKey, field.pairedWith.inputKey] : [field.inputKey];
}

export function isAdvancedField(field: SchemaFieldDef, schema: NodeSchema | null, inputs: Node['inputs']): boolean {
  if (field.advanced !== undefined) return field.advanced;
  const spec = resolveInputSpec(schema, field.inputKey, inputs);
  return spec?.kind !== 'link' && spec?.advanced === true;
}

/**
 * The fields a node shows, in the editor's order, split into the main list
 * and the Advanced section. Fields the workflow doesn't carry are dropped
 * here, so an Advanced section with nothing to show isn't drawn at all.
 */
export function partitionFields(
  fields: SchemaFieldDef[],
  schema: NodeSchema | null,
  inputs: Node['inputs'],
): { main: SchemaFieldDef[]; advanced: SchemaFieldDef[] } {
  const main: SchemaFieldDef[] = [];
  const advanced: SchemaFieldDef[] = [];
  for (const field of fields) {
    if (field.visible && !field.visible(inputs)) continue;
    if (fieldInputKeys(field).every((key) => inputs[key] === undefined)) continue;
    (isAdvancedField(field, schema, inputs) ? advanced : main).push(field);
  }
  return { main, advanced };
}

/** How many of the fields' inputs hold something other than their default. */
export function changedFieldCount(fields: SchemaFieldDef[], schema: NodeSchema | null, inputs: Node['inputs']): number {
  let count = 0;
  for (const field of fields) {
    for (const key of fieldInputKeys(field)) {
      const spec = pickFieldSpec(resolveInputSpec(schema, key, inputs), field.fallback);
      if (isChangedFromDefault(inputs[key], spec)) count += 1;
    }
  }
  return count;
}
