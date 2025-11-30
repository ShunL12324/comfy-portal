import { SegmentedControl } from '@/components/self-ui/segmented-control';
import { Icon } from '@/components/ui/icon';
import { Input, InputField } from '@/components/ui/input';
import { Node } from '@/features/workflow/types';
import { Dice2, Info } from 'lucide-react-native';
import { TouchableOpacity, View } from 'react-native';
import BaseNode from '../../common/base-node';
import SubItem from '../../common/sub-item';

import { Text } from '@/components/ui/text';
import { useGenerationActions } from '@/features/generation/context/generation-context';
import { useWorkflowStore } from '@/features/workflow/stores/workflow-store';
import { useEffect, useState } from 'react';
import { generateRandomSeed } from './KSamplerAdvanced';

interface RandomNoiseProps {
  node: Node;
  serverId: string;
  workflowId: string;
}

export default function RandomNoise({ node, serverId, workflowId }: RandomNoiseProps) {
  const [randomSeed, setRandomSeed] = useState(true);
  const [seed, setSeed] = useState<number | null>(node.inputs.noise_seed);
  const updateNodeInput = useWorkflowStore((state) => state.updateNodeInput);
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
    </BaseNode>
  );
}
