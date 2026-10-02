import { Copy, Row, useDesign } from '@/components/ui/design-system/primitives';
import { Pressable } from '@/components/ui/pressable';
import { designTokens as t, iconStroke } from '@/constants/design-tokens';
import { ChevronRight } from '@/constants/icons';
import { advancedSectionKey, useAdvancedSectionStore } from '@/features/comfy-node/stores/advanced-section-store';
import { SchemaFieldDef, changedFieldCount } from '@/features/comfy-node/utils/schema-fields';
import { Node } from '@/features/workflow/types';
import { NodeSchema } from '@/services/node-schema';
import { MotiView } from 'moti';
import { StyleSheet, View } from 'react-native';
import SchemaFieldList from './schema-field-list';

interface AdvancedSectionProps {
  node: Node;
  workflowId: string;
  serverId: string;
  schema: NodeSchema | null;
  /** The node's advanced fields, already filtered; see `partitionFields`. */
  fields: SchemaFieldDef[];
}

/**
 * The node's rarely-touched inputs, collapsed at its bottom edge.
 *
 * The header counts the settings that differ from their defaults, so a
 * changed value is never hidden without a trace. Open or closed is
 * remembered per node.
 */
export default function AdvancedSection({ node, workflowId, serverId, schema, fields }: AdvancedSectionProps) {
  const c = useDesign();
  const key = advancedSectionKey(workflowId, node.id);
  const open = useAdvancedSectionStore((state) => state.open[key] === true);
  const setOpen = useAdvancedSectionStore((state) => state.setOpen);

  if (fields.length === 0) return null;

  const changed = changedFieldCount(fields, schema, node.inputs);
  const summary = changed > 0 ? `${changed} changed` : null;

  return (
    <View style={{ borderTopWidth: StyleSheet.hairlineWidth, borderColor: c.subtle }}>
      <Pressable
        onPress={() => setOpen(key, !open)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={summary ? `Advanced, ${summary}` : 'Advanced'}
        style={{ minHeight: t.height.touch, justifyContent: 'center' }}
      >
        <Row style={{ gap: t.node.inlineGap }}>
          <Copy size="label" muted numberOfLines={1} style={[t.node.label, { flex: 1 }]}>
            Advanced
          </Copy>
          {summary ? (
            <Copy size="metadata" style={[t.node.hint, { color: c.tint }]}>
              {summary}
            </Copy>
          ) : null}
          <MotiView
            animate={{ rotate: open ? '90deg' : '0deg' }}
            transition={{ type: 'timing', duration: t.motion.fast }}
          >
            <ChevronRight strokeWidth={iconStroke(t.icon.small)} size={t.icon.small} color={c.muted} />
          </MotiView>
        </Row>
      </Pressable>
      {open ? (
        <View style={{ gap: t.node.fieldGap }}>
          <SchemaFieldList node={node} workflowId={workflowId} serverId={serverId} schema={schema} fields={fields} />
        </View>
      ) : null}
    </View>
  );
}
