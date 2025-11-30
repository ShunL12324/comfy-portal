import { SegmentedControl } from '@/components/self-ui/segmented-control';
import { Input, InputField } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { useWorkflowStore } from '@/features/workflow/stores/workflow-store';
import { Node } from '@/features/workflow/types';
import { showToast } from '@/utils/toast';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BaseNode from '../../common/base-node';
import SubItem from '../../common/sub-item';

const RESOLUTION_OPTIONS = [
  { label: '1024x1024', width: 1024, height: 1024 },
  { label: '768x1024', width: 768, height: 1024 },
  { label: '512x512', width: 512, height: 512 },
  { label: 'Custom' },
] as const;

type ResolutionOption = (typeof RESOLUTION_OPTIONS)[number]['label'];

interface EmptySD3LatentImageProps {
  node: Node;
  serverId: string;
  workflowId: string;
}

export default function EmptySD3LatentImage({ node, serverId, workflowId }: EmptySD3LatentImageProps) {
  const insects = useSafeAreaInsets();
  const updateNodeInput = useWorkflowStore((state) => state.updateNodeInput);

  const [dimensions, setDimensions] = useState({
    width: node.inputs.width,
    height: node.inputs.height,
  });
  const [selectedResolution, setSelectedResolution] = useState<ResolutionOption>(() => {
    return (
      RESOLUTION_OPTIONS.find(
        (option) => 'width' in option && option.width === dimensions.width && option.height === dimensions.height,
      )?.label ?? 'Custom'
    );
  });

  useEffect(() => {
    updateNodeInput(workflowId, node.id, 'width', Number(dimensions.width));
    updateNodeInput(workflowId, node.id, 'height', Number(dimensions.height));
  }, [dimensions]);

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
        <View className="flex-col gap-2">
          <SegmentedControl
            options={RESOLUTION_OPTIONS.map((option) => option.label)}
            value={selectedResolution}
            onChange={(value) => {
              handleResolutionChange(value as ResolutionOption);
            }}
          />
          <View className="flex-row items-center gap-2">
            <View className="flex-1 flex-col gap-2">
              <Text size="xs" allowFontScaling={false} className="pl-1 font-medium text-typography-950">
                Width
              </Text>
              <Input
                className="flex-1 rounded-md border-0 bg-background-50"
                variant="outline"
                size="sm"
                isDisabled={selectedResolution !== 'Custom'}
              >
                <InputField
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
                      showToast.error(
                        'Invalid width',
                        `Please enter a valid integer number between 16 and 10240`,
                        insects.top,
                      );
                    }
                  }}
                />
              </Input>
            </View>
            <Text className="font-medium">×</Text>
            <View className="flex-1 flex-col gap-2">
              <Text size="xs" allowFontScaling={false} className="pl-1 font-medium text-typography-950">
                Height
              </Text>
              <Input
                className="flex-1 rounded-md border-0 bg-background-50"
                variant="outline"
                size="sm"
                isDisabled={selectedResolution !== 'Custom'}
              >
                <InputField
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
                      showToast.error(
                        'Invalid height',
                        `Please enter a valid integer number between 16 and 10240`,
                        insects.top,
                      );
                    }
                  }}
                />
              </Input>
            </View>
          </View>
        </View>
      </SubItem>
    </BaseNode>
  );
}
