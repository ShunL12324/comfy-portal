import { Icon } from '@/components/ui/icon';
import { X } from '@/constants/icons';
import { NativeSegments } from '@/components/ui/design-system/native-controls';
import { NumberSlider } from '@/components/self-ui/slider';
import { Input, InputField } from '@/components/ui/input';
import { useWorkflowStore } from '@/features/workflow/stores/workflow-store';
import { Node } from '@/features/workflow/types';
import { showToast } from '@/utils/toast';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { designTokens as t } from '@/constants/design-tokens';
import BaseNode from '../../common/base-node';
import SubItem from '../../common/sub-item';
import { Copy } from '@/components/ui/design-system/primitives';

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

  useEffect(() => {
    if (hasLinkedDimensions) return;
    updateNodeInput(workflowId, node.id, 'width', Number(dimensions.width));
    updateNodeInput(workflowId, node.id, 'height', Number(dimensions.height));
  }, [dimensions, hasLinkedDimensions, workflowId, node.id, updateNodeInput]);

  const handleResolutionChange = (value: ResolutionOption) => {
    setSelectedResolution(value);
    if (value === 'Custom') return;

    const selectedOption = RESOLUTION_OPTIONS.find((option) => option.label === value);
    if (!selectedOption || !('width' in selectedOption) || !('height' in selectedOption)) return;

    setDimensions({
      width: selectedOption.width,
      height: selectedOption.height,
    });
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
                        setDimensions((prev) => ({ ...prev, width: parsedValue }));
                      }
                    }}
                    onBlur={() => {
                      if (dimensions.width < 16 || dimensions.width > 10240) {
                        setDimensions((prev) => ({ ...prev, width: 1024 }));
                        showToast.error('Invalid width', `Please enter a valid integer number between 16 and 10240`);
                      }
                    }}
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
                        setDimensions((prev) => ({ ...prev, height: parsedValue }));
                      }
                    }}
                    onBlur={() => {
                      if (dimensions.height < 16 || dimensions.height > 10240) {
                        setDimensions((prev) => ({ ...prev, height: 1024 }));
                        showToast.error('Invalid height', `Please enter a valid integer number between 16 and 10240`);
                      }
                    }}
                  />
                </Input>
              </View>
            </View>
          </View>
        )}
      </SubItem>
      <SubItem title="Batch Size">
        <NumberSlider
          value={node.inputs.batch_size || 1}
          minValue={1}
          maxValue={4}
          step={1}
          onChangeEnd={(value) => updateNodeInput(workflowId, node.id, 'batch_size', Number(value))}
        />
      </SubItem>
    </BaseNode>
  );
}
