import { SegmentedControl } from '@/components/self-ui/segmented-control';
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
import SubItem from './sub-item';

/** ComfyUI seeds are unsigned 32-bit integers. */
const MAX_SEED = 0xffffffff;

export const generateRandomSeed = () => {
  const buffer = new Uint32Array(1);
  Crypto.getRandomValues(buffer);
  return buffer[0];
};

interface SeedControlProps {
  node: Node;
  workflowId: string;
  /** Sampler nodes call it `seed`; noise nodes call it `noise_seed`. */
  inputKey: 'seed' | 'noise_seed';
  title?: string;
}

/**
 * Random/Fixed seed picker.
 *
 * Committed edits write through to the workflow store — a seed that only lived
 * in local state would display as "Fixed" while the generation quietly used
 * whatever value was last persisted.
 */
export default function SeedControl({ node, workflowId, inputKey, title = 'Seed' }: SeedControlProps) {
  const updateNodeInput = useWorkflowStore((state) => state.updateNodeInput);
  const { registerNodeHooks, unregisterNodeHooks } = useGenerationActions();

  // An array means the input is wired to another node. SubItem renders an
  // explanatory message instead of the control, and we must never write over
  // the link.
  const isLinked = Array.isArray(node.inputs[inputKey]);

  const [randomSeed, setRandomSeed] = useState(true);
  const [seed, setSeed] = useState<number>(() => {
    const current = Number(node.inputs[inputKey]);
    return Number.isFinite(current) ? current : 0;
  });
  // Kept as text while editing so the field can be cleared and typed into
  // freely; only the committed value is clamped and persisted.
  const [draft, setDraft] = useState<string>(() => String(seed));

  useEffect(() => {
    if (randomSeed && !isLinked) {
      registerNodeHooks(node.id, {
        onPre: () => {
          const newSeed = generateRandomSeed();
          setSeed(newSeed);
          setDraft(String(newSeed));
          updateNodeInput(workflowId, node.id, inputKey, newSeed);
        },
      });
    } else {
      unregisterNodeHooks(node.id);
    }

    return () => {
      unregisterNodeHooks(node.id);
    };
  }, [
    node.id,
    randomSeed,
    isLinked,
    workflowId,
    inputKey,
    registerNodeHooks,
    unregisterNodeHooks,
    updateNodeInput,
  ]);

  const applySeed = (value: number) => {
    setSeed(value);
    setDraft(String(value));
    updateNodeInput(workflowId, node.id, inputKey, value);
  };

  /** Clamp and persist the draft. Runs on blur, not on every keystroke. */
  const commitDraft = () => {
    const value = draft === '' ? 0 : Math.min(Number(draft), MAX_SEED);
    applySeed(Number.isFinite(value) ? value : 0);
  };

  const handleModeChange = (value: string) => {
    const isRandom = value === 'Random';
    setRandomSeed(isRandom);
    // Switching to Fixed pins whatever is on screen, so the displayed seed is
    // the one that actually runs.
    if (!isRandom) commitDraft();
  };

  return (
    <SubItem title={title} node={node} dependencies={[inputKey]}>
      <SegmentedControl
        options={['Random', 'Fixed']}
        value={randomSeed ? 'Random' : 'Fixed'}
        onChange={handleModeChange}
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
              value={draft}
              onChangeText={(text) => setDraft(text.replace(/[^0-9]/g, ''))}
              onBlur={commitDraft}
              keyboardType="numeric"
              className="text-sm"
            />
          </Input>
          <TouchableOpacity onPress={() => applySeed(generateRandomSeed())} disabled={randomSeed}>
            <View
              className={`h-10 w-10 items-center justify-center rounded-lg bg-background-50 ${randomSeed ? 'opacity-50' : ''}`}
            >
              <Icon as={Dice2} size="sm" className="text-typography-500" />
            </View>
          </TouchableOpacity>
        </View>
        <View className="flex-row items-start gap-2">
          <Icon as={Info} size="xs" className="mt-[1px] text-typography-500" />
          <Text size="sm" className="flex-1 text-xs text-typography-500">
            Using the same seed will not trigger image generation again.
          </Text>
        </View>
      </View>
    </SubItem>
  );
}
