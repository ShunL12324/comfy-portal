import { SchemaFieldDef } from '@/features/comfy-node/utils/schema-fields';
import { Node } from '@/features/workflow/types';
import { NodeSchema } from '@/services/node-schema';
import PairedNumberField from './paired-number-field';
import SchemaField from './schema-field';

interface SchemaFieldListProps {
  node: Node;
  workflowId: string;
  serverId: string;
  schema: NodeSchema | null;
  /** Already filtered for visibility; see `partitionFields`. */
  fields: SchemaFieldDef[];
}

/** Each field as a `SchemaField`, or as a paired row when it has a partner. */
export default function SchemaFieldList({ fields, ...shared }: SchemaFieldListProps) {
  return (
    <>
      {fields.map(({ visible: _visible, advanced: _advanced, pairedWith, ...field }) =>
        pairedWith ? (
          <PairedNumberField
            key={field.inputKey}
            {...shared}
            {...field}
            pairKey={pairedWith.inputKey}
            pairTitle={pairedWith.title}
            rowTitle={pairedWith.rowTitle}
            swappable={pairedWith.swappable}
          />
        ) : (
          <SchemaField key={field.inputKey} {...shared} {...field} />
        ),
      )}
    </>
  );
}
