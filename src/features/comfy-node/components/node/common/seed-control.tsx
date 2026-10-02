import { NativeSegments } from '@/components/ui/design-system/native-controls';
import { Icon } from '@/components/ui/icon';
import { Input, InputField } from '@/components/ui/input';
import { Copy } from '@/components/ui/design-system/primitives';
import { useGenerationActions } from '@/features/generation/context/generation-context';
import { useWorkflowStore } from '@/features/workflow/stores/workflow-store';
import { Node } from '@/features/workflow/types';
import * as Crypto from 'expo-crypto';
import { Dice2, Info } from '@/constants/icons';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import SubItem from './sub-item';
import { Pressable } from '@/components/ui/pressable';

/**
 * ComfyUI accepts seeds up to 2^64-1, which JS numbers can't represent
 * exactly, so cap at the largest integer we can round-trip losslessly. Going
 * lower would silently truncate seeds from workflows authored elsewhere.
 */
const MAX_SEED = Number.MAX_SAFE_INTEGER;

/** 32 bits of entropy is ample for picking a seed; only the cap above matters. */
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
  /**
   * Start in Random mode (the default). Nodes whose seed only decides whether
   * a cached result is reused, rather than what gets generated, start Fixed.
   */
  defaultRandom?: boolean;
}

/**
 * Random/Fixed seed picker.
 *
 * Committed edits write through to the workflow store — a seed that only lived
 * in local state would display as "Fixed" while the generation quietly used
 * whatever value was last persisted.
 */
export default function SeedControl({
  node,
  workflowId,
  inputKey,
  title = 'Seed',
  defaultRandom = true,
}: SeedControlProps) {
  const updateNodeInput = useWorkflowStore((state) => state.updateNodeInput);
  const { registerNodeHooks, unregisterNodeHooks } = useGenerationActions();

  // An array means the input is wired to another node. SubItem renders an
  // explanatory message instead of the control, and we must never write over
  // the link.
  const isLinked = Array.isArray(node.inputs[inputKey]);

  const [randomSeed, setRandomSeed] = useState(defaultRandom);
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
  }, [node.id, randomSeed, isLinked, workflowId, inputKey, registerNodeHooks, unregisterNodeHooks, updateNodeInput]);

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
      <NativeSegments
        label={title}
        options={['Random', 'Fixed']}
        value={randomSeed ? 'Random' : 'Fixed'}
        onChange={handleModeChange}
      />
      <View className="gap-1 flex-col">
        <View className="gap-2 flex-row items-center justify-between">
          <Input
            variant="outline"
            size="md"
            isDisabled={randomSeed}
            isInvalid={false}
            isReadOnly={false}
            className="rounded-md bg-well flex-1 border-0"
          >
            <InputField
              placeholder="Custom Seed"
              value={draft}
              onChangeText={(text) => setDraft(text.replace(/[^0-9]/g, ''))}
              onBlur={commitDraft}
              keyboardType="numeric"
              className="font-sans tabular-nums"
            />
          </Input>
          <Pressable
            className="h-11 w-11 active:opacity-pressed items-center justify-center"
            accessibilityLabel="Randomize seed"
            onPress={() => applySeed(generateRandomSeed())}
            disabled={randomSeed}
          >
            <View
              className={`h-9 w-9 rounded-md bg-surface-raised items-center justify-center ${randomSeed ? 'opacity-disabled' : ''}`}
            >
              <Icon as={Dice2} size="sm" className="text-content-secondary" />
            </View>
          </Pressable>
        </View>
        <View className="gap-2 flex-row items-start">
          <Icon as={Info} size="xs" className="text-content-secondary mt-0.5" />
          <Copy size="metadata" muted className="flex-1">
            Using the same seed will not trigger image generation again.
          </Copy>
        </View>
      </View>
    </SubItem>
  );
}
