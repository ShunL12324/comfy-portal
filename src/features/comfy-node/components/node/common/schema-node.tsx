import { Node } from '@/features/workflow/types';
import { useNodeSchema } from '@/hooks/use-node-schema';
import { NodeSchema } from '@/services/node-schema';
import { ReactNode } from 'react';
import BaseNode from './base-node';
import SchemaField, { SchemaFieldProps } from './schema-field';

export interface NodeEditorProps {
  node: Node;
  serverId: string;
  workflowId: string;
}

export type SchemaFieldDef = Omit<SchemaFieldProps, 'node' | 'workflowId' | 'serverId' | 'schema'> & {
  /** Hide the field when another input makes it irrelevant. */
  visible?: (inputs: Node['inputs']) => boolean;
};

interface SchemaNodeProps extends NodeEditorProps {
  fields: SchemaFieldDef[];
  /** Rendered above the fields. */
  header?: (schema: NodeSchema | null) => ReactNode;
  /** Rendered below the fields. */
  footer?: (schema: NodeSchema | null) => ReactNode;
}

/**
 * A node editor that is a curated list of its inputs: which to show, in what
 * order, under which title. Controls come from `SchemaField`.
 */
export default function SchemaNode({ node, serverId, workflowId, fields, header, footer }: SchemaNodeProps) {
  const schema = useNodeSchema(serverId, node.class_type);
  return (
    <BaseNode node={node}>
      {header?.(schema)}
      {fields.map(({ visible, ...field }) =>
        visible && !visible(node.inputs) ? null : (
          <SchemaField
            key={field.inputKey}
            node={node}
            workflowId={workflowId}
            serverId={serverId}
            schema={schema}
            {...field}
          />
        ),
      )}
      {footer?.(schema)}
    </BaseNode>
  );
}
