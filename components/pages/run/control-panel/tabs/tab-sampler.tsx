import { Sampler, SamplerSelector } from '@/components/selectors/sampler';
import { Scheduler } from '@/components/selectors/scheduler';
import { SchedulerSelector } from '@/components/selectors/scheduler/selector';
import { SegmentedControl } from '@/components/self-ui/segmented-control';
import { SmoothSlider } from '@/components/self-ui/smooth-slider';
import { Icon } from '@/components/ui/icon';
import { Input, InputField } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { usePresetsStore } from '@/store/presets';
import * as Crypto from 'expo-crypto';
import { Dice2, Info } from 'lucide-react-native';
import { MotiView } from 'moti';
import { useEffect, useState } from 'react';
import { ScrollView, TouchableOpacity, View } from 'react-native';
import { TabItem } from './common';

interface TabSamplerProps {
  serverId: string;
  presetId: string;
}

export default function TabSampler({ serverId, presetId }: TabSamplerProps) {
  // data
  const preset = usePresetsStore((state) =>
    state.presets.find((p) => p.id === presetId),
  );

  // actions
  const updatePreset = usePresetsStore((state) => state.updatePreset);

  // local state
  const [sampler, setSampler] = useState<Sampler>(
    preset?.params.sampler || 'euler_ancestral',
  );
  const [scheduler, setScheduler] = useState<Scheduler>(
    preset?.params.scheduler || 'normal',
  );
  const [steps, setSteps] = useState(preset?.params.steps || 25);
  const [cfg, setCfg] = useState(preset?.params.cfg || 7.5);
  const [useRandomSeed, setUseRandomSeed] = useState(false);
  const [seed, setSeed] = useState(preset?.params.seed || 0);

  // handlers
  useEffect(() => {
    if (!preset) return;
    updatePreset(presetId, {
      params: {
        ...preset?.params,
        sampler,
        scheduler,
        steps,
        cfg,
        seed,
      },
    });
  }, [sampler, scheduler, steps, cfg, seed]);

  return (
    <ScrollView
      className="flex-1 bg-background-0"
      contentContainerStyle={{ gap: 16, padding: 16 }}
    >
      <TabItem title="Sampler">
        <SamplerSelector
          value={sampler}
          onChange={(value) => {
            setSampler(value);
          }}
        />
      </TabItem>
      <TabItem title="Scheduler">
        <SchedulerSelector
          value={scheduler}
          onChange={(value) => {
            setScheduler(value);
          }}
        />
      </TabItem>
      <TabItem
        title="Steps"
        titleRight={
          <View className="flex-row items-center justify-between rounded-lg bg-background-100 px-2 py-1">
            <Text size="sm" bold>
              {steps}
            </Text>
          </View>
        }
      >
        <SmoothSlider
          value={steps}
          minValue={1}
          maxValue={100}
          step={1}
          onChange={setSteps}
          className="flex-1"
          showButtons={true}
        />
      </TabItem>
      <TabItem
        title="CFG Scale"
        titleRight={
          <View className="flex-row items-center justify-between rounded-lg bg-background-100 px-2 py-1">
            <Text size="sm" bold>
              {cfg}
            </Text>
          </View>
        }
      >
        <SmoothSlider
          value={cfg}
          minValue={1}
          maxValue={30}
          step={0.5}
          onChange={setCfg}
          className="flex-1"
          showButtons={true}
          decimalPlaces={1}
        />
      </TabItem>
      <TabItem title="Seed">
        <SegmentedControl
          options={['Random', 'Fixed']}
          value={useRandomSeed ? 'Random' : 'Fixed'}
          onChange={(value: string) => setUseRandomSeed(value === 'Random')}
        />
        <MotiView
          animate={{
            opacity: !useRandomSeed ? 1 : 0,
            scale: !useRandomSeed ? 1 : 0.95,
          }}
          transition={{
            type: 'timing',
            duration: 200,
          }}
          className="flex-col gap-1 overflow-hidden"
        >
          <View className="flex-row items-center justify-between gap-2">
            <Input
              variant="outline"
              size="md"
              isDisabled={false}
              isInvalid={false}
              isReadOnly={false}
              className="h-10 flex-1 rounded-lg border-0 bg-background-50"
            >
              <InputField
                placeholder="Custom Seed"
                value={seed?.toString() || ''}
                onChangeText={(text) => setSeed(Number(text))}
                keyboardType="numeric"
                className="text-sm"
              />
            </Input>
            <TouchableOpacity
              onPress={() => {
                // Generate a random 32-bit integer (-2147483648 to 2147483647)
                const buffer = new Int32Array(1);
                Crypto.getRandomValues(buffer);
                setSeed(buffer[0]);
              }}
            >
              <View className="h-10 w-10 items-center justify-center rounded-lg bg-background-50">
                <Icon as={Dice2} size="sm" className="text-typography-500" />
              </View>
            </TouchableOpacity>
          </View>
          <View className="flex-row items-center gap-2">
            <Icon as={Info} size="xs" className="text-typography-500" />
            <Text size="sm" className="text-xs text-typography-500">
              Using the same seed will not trigger image generation again.
            </Text>
          </View>
        </MotiView>
      </TabItem>
    </ScrollView>
  );
}
