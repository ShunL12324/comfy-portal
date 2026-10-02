import { SchemaFieldDef, partitionFields } from '@/features/comfy-node/utils/schema-fields';
import { Node } from '@/features/workflow/types';
import { useNodeSchema } from '@/hooks/use-node-schema';
import { NodeSchema } from '@/services/node-schema';
import { ReactNode } from 'react';
import AdvancedSection from './advanced-section';
import BaseNode from './base-node';
import SchemaFieldList from './schema-field-list';

export type { SchemaFieldDef };

export interface NodeEditorProps {
  node: Node;
  serverId: string;
  workflowId: string;
}

interface SchemaNodeProps extends NodeEditorProps {
  fields: SchemaFieldDef[];
  /** Rendered above the fields. */
  header?: (schema: NodeSchema | null) => ReactNode;
  /** Rendered below the main fields, above the Advanced section. */
  footer?: (schema: NodeSchema | null) => ReactNode;
}

/**
 * A node editor that is a curated list of its inputs: which to show, in what
 * order, under which title. Controls come from `SchemaField`. Fields the
 * server (or the editor) marks advanced keep their order but move to a
 * collapsed section at the bottom of the node.
 */
export default function SchemaNode({ node, serverId, workflowId, fields, header, footer }: SchemaNodeProps) {
  const schema = useNodeSchema(serverId, node.class_type);
  const { main, advanced } = partitionFields(fields, schema, node.inputs);
  const shared = { node, serverId, workflowId, schema };
  return (
    <BaseNode node={node}>
      {header?.(schema)}
      <SchemaFieldList {...shared} fields={main} />
      {footer?.(schema)}
      <AdvancedSection {...shared} fields={advanced} />
    </BaseNode>
  );
}
