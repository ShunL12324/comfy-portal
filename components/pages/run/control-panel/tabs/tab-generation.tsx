import { SegmentedControl } from '@/components/self-ui/segmented-control';
import { SmoothSlider } from '@/components/self-ui/smooth-slider';
import { Icon } from '@/components/ui/icon';
import { Input, InputField } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { usePresetsStore } from '@/store/presets';
import { useThemeStore } from '@/store/theme';
import { showToast } from '@/utils/toast';
import { Info, X } from 'lucide-react-native';
import { MotiView } from 'moti';
import { useState } from 'react';
import { Keyboard, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TabItem } from './common';

interface TabGenerationProps {
  serverId: string;
  presetId: string;
}

const RESOLUTION_OPTIONS = [
  { label: '1024x1024', width: 1024, height: 1024 },
  { label: '768x1024', width: 768, height: 1024 },
  { label: '512x512', width: 512, height: 512 },
  { label: 'Custom' },
] as const;

type ResolutionOption = (typeof RESOLUTION_OPTIONS)[number]['label'];

export default function TabGeneration({ serverId, presetId }: TabGenerationProps) {
  const insects = useSafeAreaInsets();

  // store data
  const preset = usePresetsStore((state) => state.presets.find((p) => p.id === presetId));
  const { theme } = useThemeStore();

  if (!preset) return null;

  // store actions
  const updatePreset = usePresetsStore((state) => state.updatePreset);

  const [selectedResolution, setSelectedResolution] = useState<ResolutionOption>(
    RESOLUTION_OPTIONS.find(
      (option) => 'width' in option && option.width === preset?.params.width && option.height === preset?.params.height,
    )?.label ?? 'Custom',
  );

  const handleResolutionChange = (value: ResolutionOption) => {
    setSelectedResolution(value);
    if (!preset || value === 'Custom') return;

    const selectedOption = RESOLUTION_OPTIONS.find((option) => option.label === value);
    if (!selectedOption || !('width' in selectedOption) || !('height' in selectedOption)) return;

    setTimeout(() => {
      updatePreset(presetId, {
        ...preset,
        params: {
          ...preset.params,
          width: selectedOption.width,
          height: selectedOption.height,
        },
      });
    }, 100);
  };

  return (
    <Pressable onPress={Keyboard.dismiss} className="flex-1">
      <ScrollView className="flex-1 bg-background-0" contentContainerStyle={{ gap: 16, padding: 16 }}>
        <TabItem title="Resolution">
          <SegmentedControl
            options={RESOLUTION_OPTIONS.map((option) => option.label)}
            value={selectedResolution}
            onChange={(value) => {
              handleResolutionChange(value as ResolutionOption);
            }}
          />
          <MotiView
            from={{
              height: 0,
              scale: 0.95,
              opacity: 0,
            }}
            animate={{
              height: selectedResolution === 'Custom' ? 55 : 0,
              scale: selectedResolution === 'Custom' ? 1 : 0.95,
              opacity: selectedResolution === 'Custom' ? 1 : 0,
            }}
            transition={{
              type: 'timing',
              duration: 200,
              opacity: {
                duration: 150,
                delay: selectedResolution === 'Custom' ? 50 : 0,
              },
              scale: {
                duration: 200,
                delay: selectedResolution === 'Custom' ? 100 : 0,
              },
            }}
            className="flex-row items-center gap-2 overflow-hidden pt-1"
          >
            <View className="flex-1 flex-col gap-2">
              <Text size="xs" allowFontScaling={false} className="pl-1 font-medium text-typography-950">
                Width
              </Text>
              <Input className="flex-1 rounded-md border-0 bg-background-50" variant="outline" size="sm">
                <InputField
                  placeholder="Width"
                  keyboardType="numeric"
                  value={preset?.params.width.toString()}
                  onChangeText={(text) => {
                    if (!preset) return;

                    const parsedValue = text === '' ? 0 : parseInt(text, 10);
                    if (text === '' || (!isNaN(parsedValue) && parsedValue > 0)) {
                      updatePreset(presetId, {
                        ...preset,
                        params: {
                          ...preset.params,
                          width: parsedValue,
                        },
                      });
                    }
                  }}
                  onBlur={() => {
                    if (!preset) return;
                    if (preset.params.width < 16 || preset.params.width > 10240) {
                      updatePreset(presetId, {
                        ...preset,
                        params: { ...preset.params, width: 1024 },
                      });
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
            <Icon as={X} size="sm" className="h-4 w-4" />
            <View className="flex-1 flex-col gap-2">
              <Text size="xs" allowFontScaling={false} className="pl-1 font-medium text-typography-950">
                Height
              </Text>
              <Input className="flex-1 rounded-md border-0 bg-background-50" variant="outline" size="sm">
                <InputField
                  placeholder="Height"
                  keyboardType="numeric"
                  value={preset?.params.height.toString()}
                  onChangeText={(text) => {
                    if (!preset) return;

                    const parsedValue = text === '' ? 0 : parseInt(text, 10);
                    if (text === '' || (!isNaN(parsedValue) && parsedValue > 0)) {
                      updatePreset(presetId, {
                        ...preset,
                        params: { ...preset.params, height: parsedValue },
                      });
                    }
                  }}
                  onBlur={() => {
                    if (!preset) return;
                    if (preset.params.height < 16 || preset.params.height > 10240) {
                      updatePreset(presetId, {
                        ...preset,
                        params: { ...preset.params, height: 1024 },
                      });
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
          </MotiView>
        </TabItem>
        <TabItem title="Stop At Clip Layer" titleRight={null}>
          <SmoothSlider
            initialValue={preset?.params.stopAtClipLayer ?? -1}
            minValue={-24}
            maxValue={-1}
            step={1}
            onChangeEnd={(value) => {
              updatePreset(presetId, {
                ...preset,
                params: { ...preset.params, stopAtClipLayer: value },
              });
            }}
            className="flex-1"
            showButtons={true}
          />
          <View className="flex-row items-start gap-2 px-1">
            <Icon as={Info} size="xs" className="mt-1 text-typography-500" />
            <Text className="flex-1 text-xs text-typography-500">
              Controls which CLIP layer to stop at. Range from -24 to -1. The value will affect how the model interprets
              your prompts. For pony-based models, usually use -2 is recommended.
            </Text>
          </View>
        </TabItem>
      </ScrollView>
    </Pressable>
  );
}
