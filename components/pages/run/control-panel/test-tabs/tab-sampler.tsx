import { Sampler, SamplerSelector } from '@/components/selectors/sampler';
import { Scheduler } from '@/components/selectors/scheduler';
import { SchedulerSelector } from '@/components/selectors/scheduler/selector';
import { SegmentedControl } from '@/components/self-ui/segmented-control';
import { SmoothSlider } from '@/components/self-ui/smooth-slider';
import { Icon } from '@/components/ui/icon';
import { Input, InputField } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { usePresetsStore } from '@/store/presets';
import { Dice2 } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

interface TabSamplerProps {
  serverId: string;
  presetId: string;
}

export default function TabSampler({ serverId, presetId }: TabSamplerProps) {
  const [useRandomSeed, setUseRandomSeed] = useState(false);
  // data
  const preset = usePresetsStore((state) =>
    state.presets.find((p) => p.id === presetId),
  );

  const [sampler, setSampler] = useState<Sampler>(
    preset?.params.sampler || 'euler_ancestral',
  );
  const [scheduler, setScheduler] = useState<Scheduler>(
    preset?.params.scheduler || 'normal',
  );
  const [steps, setSteps] = useState(preset?.params.steps || 25);
  const [cfgScale, setCfgScale] = useState(preset?.params.cfg || 7.5);
  const [seed, setSeed] = useState(preset?.params.seed);

  // actions
  const updatePreset = usePresetsStore((state) => state.updatePreset);

  return (
    <ScrollView
      className="flex-1 bg-background-0"
      contentContainerStyle={{ gap: 16, padding: 16, paddingBottom: 100 }}
    >
      <View className="flex-col gap-2">
        <View className="flex-row items-center justify-between">
          <Text size="sm" bold>
            Sampler
          </Text>
        </View>
        <SamplerSelector
          value={sampler}
          onChange={(value) => {
            setSampler(value);
          }}
        />
      </View>
      <View className="flex-col gap-2">
        <View className="flex-row items-center justify-between">
          <Text size="sm" bold>
            Scheduler
          </Text>
        </View>
        <SchedulerSelector
          value={scheduler}
          onChange={(value) => {
            setScheduler(value);
          }}
        />
      </View>
      <View className="flex-col gap-2">
        <View className="flex-row items-center justify-between">
          <Text size="sm" bold>
            Steps
          </Text>
          <View className="flex-row items-center justify-between rounded-lg bg-background-100 px-2 py-1">
            <Text size="sm" bold>
              {steps}
            </Text>
          </View>
        </View>

        <SmoothSlider
          value={steps}
          minValue={1}
          maxValue={100}
          step={1}
          onChange={setSteps}
          className="flex-1"
          showButtons={true}
        />
      </View>
      <View className="flex-col gap-2">
        <View className="flex-row items-center justify-between">
          <Text size="sm" bold>
            CFG Scale
          </Text>
          <View className="flex-row items-center justify-between rounded-lg bg-background-100 px-2 py-1">
            <Text size="sm" bold>
              {cfgScale}
            </Text>
          </View>
        </View>
        <SmoothSlider
          value={cfgScale}
          minValue={1}
          maxValue={30}
          step={0.5}
          onChange={setCfgScale}
          className="flex-1"
          showButtons={true}
          decimalPlaces={1}
        />
      </View>
      <View className="flex-col gap-2">
        <View className="flex-row items-center justify-between">
          <Text size="sm" bold>
            Seed
          </Text>
        </View>
        <SegmentedControl
          options={['Random', 'Fixed']}
          value={useRandomSeed ? 'Random' : 'Fixed'}
          onChange={(value: string) => setUseRandomSeed(value === 'Random')}
        />
        {useRandomSeed && (
          <Animated.View
            className={`flex-row items-center justify-between gap-2 overflow-hidden ${
              useRandomSeed ? 'h-0' : 'h-10'
            }`}
            entering={FadeIn}
            exiting={FadeOut}
          >
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
              />
            </Input>
            <TouchableOpacity
              onPress={() => setSeed(Math.floor(Math.random() * 1000000))}
            >
              <View className="h-10 w-10 items-center justify-center rounded-lg bg-background-50">
                <Icon as={Dice2} size="sm" className="text-typography-500" />
              </View>
            </TouchableOpacity>
          </Animated.View>
        )}
      </View>
    </ScrollView>
  );
}
