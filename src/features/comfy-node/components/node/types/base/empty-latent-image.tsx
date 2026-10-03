import { Icon } from '@/components/ui/icon';
import { X } from '@/constants/icons';
import { NativeSegments } from '@/components/ui/design-system/native-controls';
import { Input, InputField } from '@/components/ui/input';
import { useWorkflowStore } from '@/features/workflow/stores/workflow-store';
import { Node } from '@/features/workflow/types';
import { pickFieldSpec } from '@/features/comfy-node/utils/schema-inputs';
import { useNodeSchema } from '@/hooks/use-node-schema';
import { resolveInputSpec } from '@/services/node-schema';
import { showToast } from '@/utils/toast';
import { useState } from 'react';
import { View } from 'react-native';
import { designTokens as t } from '@/constants/design-tokens';
import BaseNode from '../../common/base-node';
import SchemaField from '../../common/schema-field';
import SubItem from '../../common/sub-item';
import { Copy } from '@/components/ui/design-system/primitives';
import { CORE_NUMBER_SPECS } from './core-number-specs';

const SPECS = CORE_NUMBER_SPECS.EmptyLatentImage;

const RESOLUTION_OPTIONS = [
  { label: '1024x1024', width: 1024, height: 1024 },
  { label: '768x1024', width: 768, height: 1024 },
  { label: '512x512', width: 512, height: 512 },
  { label: 'Custom' },
] as const;

type ResolutionOption = (typeof RESOLUTION_OPTIONS)[number]['label'];

interface EmptyLatentImageProps {
  node: Node;
  serverId: string;
  workflowId: string;
}

export default function EmptyLatentImage({ node, serverId, workflowId }: EmptyLatentImageProps) {
  const updateNodeInput = useWorkflowStore((state) => state.updateNodeInput);
  const schema = useNodeSchema(serverId, node.class_type);
  const isWidthLinked = Array.isArray(node.inputs.width);
  const isHeightLinked = Array.isArray(node.inputs.height);
  const hasLinkedDimensions = isWidthLinked || isHeightLinked;

  const [dimensions, setDimensions] = useState({
    width: typeof node.inputs.width === 'number' ? node.inputs.width : 1024,
    height: typeof node.inputs.height === 'number' ? node.inputs.height : 1024,
  });
  const [selectedResolution, setSelectedResolution] = useState<ResolutionOption>(() => {
    return (
      RESOLUTION_OPTIONS.find(
        (option) => 'width' in option && option.width === dimensions.width && option.height === dimensions.height,
      )?.label ?? 'Custom'
    );
  });

  /** The server's range for a side; the saved value is never rewritten until it is edited. */
  const boundsOf = (key: 'width' | 'height') => {
    const spec = pickFieldSpec(resolveInputSpec(schema, key, node.inputs), SPECS[key]);
    const numeric = spec.kind === 'int' || spec.kind === 'float' ? spec : SPECS[key];
    return { min: numeric.min ?? SPECS[key].min, max: numeric.max ?? SPECS[key].max };
  };

  const setDimension = (key: 'width' | 'height', value: number) => {
    setDimensions((prev) => ({ ...prev, [key]: value }));
    const { min, max } = boundsOf(key);
    if (value >= min && value <= max) updateNodeInput(workflowId, node.id, key, value);
  };

  /** Out-of-range typing is clamped to the server's bounds when the field is left. */
  const commitDimension = (key: 'width' | 'height', label: string) => {
    const { min, max } = boundsOf(key);
    const value = dimensions[key];
    if (value >= min && value <= max) return;
    const clamped = Math.min(max, Math.max(min, value));
    setDimensions((prev) => ({ ...prev, [key]: clamped }));
    updateNodeInput(workflowId, node.id, key, clamped);
    showToast.error(`Invalid ${label}`, `Please enter an integer between ${min} and ${max}`);
  };

  const handleResolutionChange = (value: ResolutionOption) => {
    setSelectedResolution(value);
    if (value === 'Custom') return;

    const selectedOption = RESOLUTION_OPTIONS.find((option) => option.label === value);
    if (!selectedOption || !('width' in selectedOption) || !('height' in selectedOption)) return;

    setDimensions({
      width: selectedOption.width,
      height: selectedOption.height,
    });
    updateNodeInput(workflowId, node.id, 'width', selectedOption.width);
    updateNodeInput(workflowId, node.id, 'height', selectedOption.height);
  };

  return (
    <BaseNode node={node}>
      <SubItem title="Resolution">
        {hasLinkedDimensions ? (
          <Copy muted>
            Width and height are linked from another node. Edit the source node to change final image size.
          </Copy>
        ) : (
          <View className="gap-2 flex-col">
            <NativeSegments
              label="Resolution"
              options={RESOLUTION_OPTIONS.map((option) => option.label)}
              value={selectedResolution}
              onChange={(value) => {
                handleResolutionChange(value as ResolutionOption);
              }}
            />
            <View style={{ gap: t.node.labelGap }}>
              <View className="flex-row items-center" style={{ gap: t.node.inlineGap }}>
                <Copy size="label" muted style={{ flex: 1, textAlign: 'center' }}>
                  Width
                </Copy>
                <View style={{ width: t.icon.small }} />
                <Copy size="label" muted style={{ flex: 1, textAlign: 'center' }}>
                  Height
                </Copy>
              </View>
              <View className="flex-row items-center" style={{ gap: t.node.inlineGap }}>
                <Input
                  className="rounded-md bg-surface-raised flex-1 border-0"
                  variant="outline"
                  size="sm"
                  isDisabled={selectedResolution !== 'Custom'}
                >
                  <InputField
                    accessibilityLabel="Width"
                    style={{ textAlign: 'center' }}
                    placeholder="Width"
                    keyboardType="numeric"
                    value={dimensions.width.toString()}
                    onChangeText={(text) => {
                      const parsedValue = text === '' ? 0 : parseInt(text, 10);
                      if (text === '' || (!isNaN(parsedValue) && parsedValue > 0)) {
                        setDimension('width', parsedValue);
                      }
                    }}
                    onBlur={() => commitDimension('width', 'width')}
                  />
                </Input>
                <Icon as={X} size="xs" className="text-content-tertiary" />
                <Input
                  className="rounded-md bg-surface-raised flex-1 border-0"
                  variant="outline"
                  size="sm"
                  isDisabled={selectedResolution !== 'Custom'}
                >
                  <InputField
                    accessibilityLabel="Height"
                    style={{ textAlign: 'center' }}
                    placeholder="Height"
                    keyboardType="numeric"
                    value={dimensions.height.toString()}
                    onChangeText={(text) => {
                      const parsedValue = text === '' ? 0 : parseInt(text, 10);
                      if (text === '' || (!isNaN(parsedValue) && parsedValue > 0)) {
                        setDimension('height', parsedValue);
                      }
                    }}
                    onBlur={() => commitDimension('height', 'height')}
                  />
                </Input>
              </View>
            </View>
          </View>
        )}
      </SubItem>
      <SchemaField
        node={node}
        serverId={serverId}
        workflowId={workflowId}
        schema={schema}
        inputKey="batch_size"
        title="Batch Size"
        fallback={SPECS.batch_size}
      />
    </BaseNode>
  );
}
