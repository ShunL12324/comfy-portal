import { SamplerSelector } from '@/components/selectors/sampler';
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
import { ScrollView, TouchableOpacity, View } from 'react-native';
import { TabItem } from './common';

interface TabSamplerProps {
  serverId: string;
  presetId: string;
}

export default function TabSampler({ serverId, presetId }: TabSamplerProps) {
  // data
  const preset = usePresetsStore((state) => state.presets.find((p) => p.id === presetId));
  if (!preset) return null;

  // actions
  const updatePreset = usePresetsStore((state) => state.updatePreset);

  return (
    <ScrollView className="flex-1 bg-background-0" contentContainerStyle={{ gap: 16, padding: 16 }}>
      <TabItem title="Sampler">
        <SamplerSelector
          value={preset?.params.sampler || 'euler_ancestral'}
          onChange={(value) => {
            updatePreset(presetId, {
              params: { ...preset?.params, sampler: value },
            });
          }}
        />
      </TabItem>
      <TabItem title="Scheduler">
        <SchedulerSelector
          value={preset?.params.scheduler || 'normal'}
          onChange={(value) => {
            updatePreset(presetId, {
              params: { ...preset?.params, scheduler: value },
            });
          }}
        />
      </TabItem>
      <TabItem title="Steps" titleRight={null}>
        <SmoothSlider
          initialValue={preset?.params.steps || 25}
          minValue={1}
          maxValue={100}
          step={1}
          onChangeEnd={(value) => {
            updatePreset(presetId, {
              params: { ...preset?.params, steps: value },
            });
          }}
          className="flex-1"
          showButtons={true}
        />
      </TabItem>
      <TabItem title="CFG Scale" titleRight={null}>
        <SmoothSlider
          initialValue={preset?.params.cfg || 7.5}
          minValue={1}
          maxValue={30}
          step={0.5}
          onChangeEnd={(value) => {
            updatePreset(presetId, {
              params: { ...preset?.params, cfg: value },
            });
          }}
          className="flex-1"
          showButtons={true}
          decimalPlaces={1}
        />
      </TabItem>
      <TabItem title="Seed">
        <SegmentedControl
          options={['Random', 'Fixed']}
          value={preset?.params.useRandomSeed ? 'Random' : 'Fixed'}
          onChange={(value: string) =>
            updatePreset(presetId, {
              params: { ...preset?.params, useRandomSeed: value === 'Random' },
            })
          }
        />
        <MotiView
          animate={{
            opacity: !preset?.params.useRandomSeed ? 1 : 0,
            scale: !preset?.params.useRandomSeed ? 1 : 0.95,
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
                value={preset?.params.seed?.toString() || ''}
                onChangeText={(text) =>
                  updatePreset(presetId, {
                    params: { ...preset?.params, seed: Number(text) },
                  })
                }
                keyboardType="numeric"
                className="text-sm"
              />
            </Input>
            <TouchableOpacity
              onPress={() => {
                // Generate a random 32-bit integer (-2147483648 to 2147483647)
                const buffer = new Int32Array(1);
                Crypto.getRandomValues(buffer);
                updatePreset(presetId, {
                  params: { ...preset?.params, seed: buffer[0] },
                });
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
