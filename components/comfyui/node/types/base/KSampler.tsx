import { SamplerSelector } from '@/components/selectors/sampler';
import { SchedulerSelector } from '@/components/selectors/scheduler';
import { SegmentedControl } from '@/components/self-ui/segmented-control';
import { NumberSlider } from '@/components/self-ui/slider';
import { Icon } from '@/components/ui/icon';
import { Input, InputField } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { useGeneration } from '@/context/generation-context';
import { useWorkflowStore } from '@/store/workflow';
import { Node } from '@/types/workflow';
import { Dice2, Info } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { TouchableOpacity, View } from 'react-native';
import BaseNode from '../../common/base-node';
import SubItem from '../../common/sub-item';
import { generateRandomSeed } from './KSamplerAdvanced';
interface KSamplerProps {
  node: Node;
  serverId: string;
  workflowId: string;
}
export default function KSampler({ node, serverId, workflowId }: KSamplerProps) {
  const [randomSeed, setRandomSeed] = useState(true);
  const [seed, setSeed] = useState<number | null>(null);
  const updateNodeInput = useWorkflowStore((state) => state.updateNodeInput);

  const { registerNodeHooks, unregisterNodeHooks } = useGeneration();

  useEffect(() => {
    if (randomSeed) {
      registerNodeHooks(node.id, {
        onPre: () => {
          const newSeed = generateRandomSeed();
          setSeed(newSeed);
          updateNodeInput(workflowId, node.id, 'seed', newSeed);
        },
      });
    } else {
      unregisterNodeHooks(node.id);
    }

    return () => {
      unregisterNodeHooks(node.id);
    };
  }, [node.id, randomSeed, workflowId, registerNodeHooks, unregisterNodeHooks, updateNodeInput]);

  return (
    <BaseNode node={node}>
      <SubItem title="Seed">
        <SegmentedControl
          options={['Random', 'Fixed']}
          value={randomSeed ? 'Random' : 'Fixed'}
          onChange={(value: string) => setRandomSeed(value === 'Random')}
        />
        <View className="mt-2 flex-col gap-1">
          <View className="flex-row items-center justify-between gap-2">
            <Input
              variant="outline"
              size="md"
              isDisabled={randomSeed}
              isInvalid={false}
              isReadOnly={false}
              className="h-10 flex-1 rounded-lg border-0 bg-background-50"
            >
              <InputField
                placeholder="Custom Seed"
                defaultValue={seed?.toString() || ''}
                onChangeText={(text) => setSeed(Number(text))}
                keyboardType="numeric"
                className="text-sm"
              />
            </Input>
            <TouchableOpacity
              onPress={() => {
                setSeed(generateRandomSeed());
              }}
              disabled={randomSeed}
            >
              <View
                className={`h-10 w-10 items-center justify-center rounded-lg bg-background-50 ${randomSeed ? 'opacity-50' : ''}`}
              >
                <Icon as={Dice2} size="sm" className="text-typography-500" />
              </View>
            </TouchableOpacity>
          </View>
          <View className="flex-row items-center justify-end gap-2">
            <Icon as={Info} size="xs" className="text-typography-500" />
            <Text size="sm" className="text-xs text-typography-500">
              Using the same seed will not trigger image generation again.
            </Text>
          </View>
        </View>
      </SubItem>
      <SubItem title="Steps">
        <NumberSlider
          defaultValue={node.inputs.steps}
          minValue={1}
          maxValue={100}
          step={1}
          onChangeEnd={(value) => updateNodeInput(workflowId, node.id, 'steps', Number(value))}
          space={12}
        />
      </SubItem>
      <SubItem title="CFG">
        <NumberSlider
          defaultValue={node.inputs.cfg}
          minValue={1}
          maxValue={30}
          step={0.5}
          onChangeEnd={(value) => updateNodeInput(workflowId, node.id, 'cfg', Number(value))}
          space={12}
          decimalPlaces={1}
        />
      </SubItem>
      <SubItem title="Sampler">
        <SamplerSelector
          value={node.inputs.sampler_name}
          onChange={(value) => updateNodeInput(workflowId, node.id, 'sampler_name', value)}
        />
      </SubItem>
      <SubItem title="Scheduler">
        <SchedulerSelector
          value={node.inputs.scheduler}
          onChange={(value) => updateNodeInput(workflowId, node.id, 'scheduler', value)}
        />
      </SubItem>
      <SubItem title="Denoise">
        <NumberSlider
          defaultValue={node.inputs.denoise}
          minValue={0}
          maxValue={1}
          step={0.01}
          onChangeEnd={(value) => updateNodeInput(workflowId, node.id, 'denoise', Number(value))}
          space={12}
          decimalPlaces={2}
        />
      </SubItem>
    </BaseNode>
  );
}
