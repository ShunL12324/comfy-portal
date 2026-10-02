import { NumberInput } from '@/components/self-ui/number-input';
import { Copy } from '@/components/ui/design-system/primitives';
import { Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { designTokens as t } from '@/constants/design-tokens';
import { ArrowLeftRight } from '@/constants/icons';
import { pairedNumberSpecs, swappedPair } from '@/features/comfy-node/utils/schema-inputs';
import { useWorkflowStore } from '@/features/workflow/stores/workflow-store';
import { resolveInputSpec } from '@/services/node-schema';
import { ReactNode } from 'react';
import { View } from 'react-native';
import SchemaField, { SchemaFieldProps } from './schema-field';
import SubItem from './sub-item';

/** A stepper's narrowest layout (44 + 64 + 44), so two share a phone row and wrap on anything narrower. */
const STEPPER_MIN_WIDTH = 152;

export interface PairedNumberFieldProps extends Omit<SchemaFieldProps, 'control' | 'onChange'> {
  /** The second input, shown to the right of the first. */
  pairKey: string;
  /** The second input's own title, used when the two can't share a row. */
  pairTitle: string;
  /** The shared row's title, e.g. `Width × Height (px)`. */
  rowTitle: string;
  /** Offer a button that swaps the two values, e.g. to flip portrait and landscape. */
  swappable?: boolean;
}

/**
 * Two numbers that are set together, such as width and height, on one row
 * with the same step and units.
 *
 * When either input is linked or missing the pair has nothing to share, so
 * each falls back to its own `SchemaField`, which explains a link itself.
 */
export default function PairedNumberField({
  pairKey,
  pairTitle,
  rowTitle,
  swappable,
  ...props
}: PairedNumberFieldProps) {
  const { node, workflowId, schema, inputKey, title, fallback, step: stepOverride, hint } = props;
  const updateNodeInput = useWorkflowStore((state) => state.updateNodeInput);
  const first = node.inputs[inputKey];
  const second = node.inputs[pairKey];

  const pair = pairedNumberSpecs(
    { value: first, spec: resolveInputSpec(schema, inputKey, node.inputs) },
    { value: second, spec: resolveInputSpec(schema, pairKey, node.inputs) },
    fallback,
    stepOverride,
  );

  if (!pair) {
    return (
      <>
        <SchemaField {...props} hint={undefined} control="stepper" />
        <SchemaField {...props} inputKey={pairKey} title={pairTitle} control="stepper" />
      </>
    );
  }

  const write = (key: string, kind: string) => (next: number) =>
    updateNodeInput(workflowId, node.id, key, kind === 'int' ? Math.round(next) : next);
  const swap = () => {
    const [nextFirst, nextSecond] = swappedPair(pair);
    updateNodeInput(workflowId, node.id, inputKey, nextFirst);
    updateNodeInput(workflowId, node.id, pairKey, nextSecond);
  };

  const stepper = (key: string, side: (typeof pair)['first']): ReactNode => (
    <View style={{ flexGrow: 1, flexBasis: STEPPER_MIN_WIDTH }}>
      <NumberInput
        value={side.value}
        // ComfyUI's INT bounds (±2^63) are past what a JS number holds exactly.
        minValue={Math.max(side.spec.min ?? -Infinity, Number.MIN_SAFE_INTEGER)}
        maxValue={Math.min(side.spec.max ?? Infinity, Number.MAX_SAFE_INTEGER)}
        step={pair.step}
        decimalPlaces={pair.decimalPlaces}
        onChange={write(key, side.spec.kind)}
      />
    </View>
  );

  return (
    <SubItem
      title={rowTitle}
      rightComponent={
        swappable ? (
          <Pressable
            onPress={swap}
            disabled={pair.first.value === pair.second.value}
            className="p-1"
            accessibilityRole="button"
            accessibilityLabel={`Swap ${title} and ${pairTitle}`}
            hitSlop={11}
          >
            <Icon as={ArrowLeftRight} size="sm" className="text-content-secondary" />
          </Pressable>
        ) : undefined
      }
    >
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.node.inlineGap }}>
        {stepper(inputKey, pair.first)}
        {stepper(pairKey, pair.second)}
      </View>
      {hint ? (
        <Copy size="metadata" muted style={{ marginTop: t.node.labelGap }}>
          {hint}
        </Copy>
      ) : null}
    </SubItem>
  );
}
