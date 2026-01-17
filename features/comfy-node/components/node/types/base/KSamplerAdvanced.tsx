import { SamplerSelector } from '@/components/common/selectors/sampler';
import { SchedulerSelector } from '@/components/common/selectors/scheduler';
import { NumberInput } from '@/components/self-ui/number-input';
import { SegmentedControl } from '@/components/self-ui/segmented-control';
import { NumberSlider } from '@/components/self-ui/slider';
import Switch from '@/components/self-ui/switch';
import { Icon } from '@/components/ui/icon';
import { Input, InputField } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { useGenerationActions } from '@/features/generation/context/generation-context';
import { useWorkflowStore } from '@/features/workflow/stores/workflow-store';
import { Node } from '@/features/workflow/types';
import * as Crypto from 'expo-crypto';
import { Dice2, Info } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { TouchableOpacity, View } from 'react-native';
import BaseNode from '../../common/base-node';
import SubItem from '../../common/sub-item';

interface KSamplerAdvancedProps {
  node: Node;
  serverId: string;
  workflowId: string;
}

export const generateRandomSeed = () => {
  const buffer = new Uint32Array(1);
  Crypto.getRandomValues(buffer);
  return buffer[0];
};

export default function KSamplerAdvanced({ node, serverId, workflowId }: KSamplerAdvancedProps) {
  const updateNodeInput = useWorkflowStore((state) => state.updateNodeInput);
  const [randomSeed, setRandomSeed] = useState(true);
  const [seed, setSeed] = useState(node.inputs.noise_seed);
  const { registerNodeHooks, unregisterNodeHooks } = useGenerationActions();

  useEffect(() => {
    if (randomSeed) {
      registerNodeHooks(node.id, {
        onPre: () => {
          const newSeed = generateRandomSeed();
          setSeed(newSeed);
          updateNodeInput(workflowId, node.id, 'noise_seed', newSeed);
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
      <SubItem
        title="Add noise"
        rightComponent={
          <Switch
            size="sm"
            value={node.inputs.add_noise === 'enable'}
            onValueChange={(value: boolean) => {
              updateNodeInput(workflowId, node.id, 'add_noise', value ? 'enable' : 'disable');
            }}
          />
        }
      />
      <SubItem title="Noise seed">
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
          <View className="flex-row items-start justify-end gap-2">
            <Icon as={Info} size="xs" className="mt-[1px] text-typography-500" />
            <Text size="sm" className="text-xs text-typography-500">
              Using the same seed will not trigger image generation again.
            </Text>
          </View>
        </View>
      </SubItem>
      <SubItem title="Steps">
        <NumberSlider
          value={node.inputs.steps}
          minValue={1}
          maxValue={100}
          step={1}
          onChangeEnd={(value) => updateNodeInput(workflowId, node.id, 'steps', Number(value))}
          space={12}
        />
      </SubItem>
      <SubItem title="CFG">
        <NumberSlider
          value={node.inputs.cfg}
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
      <SubItem title="Start at step">
        <NumberInput
          value={node.inputs.start_at_step}
          onChange={(value) => updateNodeInput(workflowId, node.id, 'start_at_step', Number(value))}
          minValue={0}
          maxValue={100}
          step={1}
          decimalPlaces={0}
          buttonSize={24}
          space={12}
        />
      </SubItem>
      <SubItem title="End at step">
        <NumberInput
          value={node.inputs.end_at_step}
          onChange={(value) => updateNodeInput(workflowId, node.id, 'end_at_step', Number(value))}
          minValue={0}
          maxValue={10000}
          step={1}
          decimalPlaces={0}
          buttonSize={24}
          space={12}
        />
      </SubItem>
      <SubItem
        title="Return with leftover noise"
        rightComponent={
          <Switch
            size="sm"
            value={node.inputs.return_with_leftover_noise === 'enable'}
            onValueChange={(value: boolean) =>
              updateNodeInput(workflowId, node.id, 'return_with_leftover_noise', value ? 'enable' : 'disable')
            }
          />
        }
      />
    </BaseNode>
  );
}
