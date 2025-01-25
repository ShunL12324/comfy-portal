import React from 'react';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Input, InputField } from '@/components/ui/input';
import {
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
} from '@/components/ui/slider';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Plus, Minus, Shuffle } from 'lucide-react-native';
import { MotiView } from 'moti';
import { TabProps, RESOLUTIONS } from '../types';

export function GenerationTab({ params, onParamsChange }: TabProps) {
  const handleRandomSeed = () => {
    onParamsChange({
      ...params,
      seed: Math.floor(Math.random() * Number.MAX_SAFE_INTEGER),
    });
  };

  const handleResolutionChange = (value: string) => {
    if (value === 'Custom') {
      onParamsChange({ ...params, width: 0, height: 0 });
    } else {
      const [width, height] = value.split('×').map(Number);
      onParamsChange({ ...params, width, height });
    }
  };

  return (
    <VStack space="lg" className="px-4 py-4">
      <VStack space="sm">
        <Text className="text-base font-medium text-primary-500">
          Resolution
        </Text>
        <SegmentedControl
          options={RESOLUTIONS.map((r) => r.label || `${r.width}×${r.height}`)}
          value={
            params.width === 0 ? 'Custom' : `${params.width}×${params.height}`
          }
          onChange={handleResolutionChange}
        />
        <MotiView
          animate={{
            height: params.width === 0 ? 49 : 0,
            opacity: params.width === 0 ? 1 : 0,
          }}
          transition={{
            type: 'timing',
            duration: 200,
          }}
          className="overflow-hidden"
        >
          <HStack space="sm" className="mt-2 px-[0.5px]">
            <Input className="flex-1 overflow-hidden rounded-xl border-[0.5px] border-background-100">
              <InputField
                value={params.width === 0 ? '' : String(params.width)}
                onChangeText={(value: string) => {
                  const num = Number(value);
                  if (!isNaN(num)) {
                    onParamsChange({ ...params, width: num });
                  }
                }}
                keyboardType="numeric"
                placeholder="Width"
                className="bg-background-50 p-3 text-sm text-primary-500"
              />
            </Input>
            <Input className="flex-1 overflow-hidden rounded-xl border-[0.5px] border-background-100">
              <InputField
                value={params.height === 0 ? '' : String(params.height)}
                onChangeText={(value: string) => {
                  const num = Number(value);
                  if (!isNaN(num)) {
                    onParamsChange({ ...params, height: num });
                  }
                }}
                keyboardType="numeric"
                placeholder="Height"
                className="bg-background-50 p-3 text-sm text-primary-500"
              />
            </Input>
          </HStack>
        </MotiView>
      </VStack>

      <VStack space="sm">
        <HStack className="items-center justify-between">
          <Text className="text-base font-medium text-primary-500">Steps</Text>
          <Text className="text-sm font-medium text-primary-500">
            {params.steps}
          </Text>
        </HStack>
        <HStack space="sm" className="items-center">
          <Button
            variant="outline"
            className="h-8 w-8 rounded-xl bg-background-50 p-0"
            onPress={() =>
              onParamsChange({
                ...params,
                steps: Math.max(1, params.steps - 1),
              })
            }
          >
            <Icon as={Minus} size="sm" className="text-primary-500" />
          </Button>
          <Slider
            value={params.steps}
            minValue={1}
            maxValue={100}
            step={1}
            onChange={(value) => onParamsChange({ ...params, steps: value })}
            size="sm"
            className="flex-1"
          >
            <SliderTrack>
              <SliderFilledTrack />
            </SliderTrack>
            <SliderThumb />
          </Slider>
          <Button
            variant="outline"
            className="h-8 w-8 rounded-xl bg-background-50 p-0"
            onPress={() =>
              onParamsChange({
                ...params,
                steps: Math.min(100, params.steps + 1),
              })
            }
          >
            <Icon as={Plus} size="sm" className="text-primary-500" />
          </Button>
        </HStack>
      </VStack>

      <VStack space="sm">
        <HStack className="items-center justify-between">
          <Text className="text-base font-medium text-primary-500">
            CFG Scale
          </Text>
          <Text className="text-sm font-medium text-primary-500">
            {params.cfg}
          </Text>
        </HStack>
        <HStack space="sm" className="items-center">
          <Button
            variant="outline"
            className="h-8 w-8 rounded-xl bg-background-50 p-0"
            onPress={() =>
              onParamsChange({
                ...params,
                cfg: Math.max(1, params.cfg - 0.5),
              })
            }
          >
            <Icon as={Minus} size="sm" className="text-primary-500" />
          </Button>
          <Slider
            value={params.cfg}
            minValue={1}
            maxValue={20}
            step={0.5}
            onChange={(value) => onParamsChange({ ...params, cfg: value })}
            size="sm"
            className="flex-1"
          >
            <SliderTrack>
              <SliderFilledTrack />
            </SliderTrack>
            <SliderThumb />
          </Slider>
          <Button
            variant="outline"
            className="h-8 w-8 rounded-xl bg-background-50 p-0"
            onPress={() =>
              onParamsChange({
                ...params,
                cfg: Math.min(20, params.cfg + 0.5),
              })
            }
          >
            <Icon as={Plus} size="sm" className="text-primary-500" />
          </Button>
        </HStack>
      </VStack>

      <VStack space="sm">
        <Text className="text-base font-medium text-primary-500">Seed</Text>
        <SegmentedControl
          options={['Random', 'Fixed']}
          value={params.useRandomSeed ? 'Random' : 'Fixed'}
          onChange={(value: string) =>
            onParamsChange({
              ...params,
              useRandomSeed: value === 'Random',
            })
          }
        />
        <MotiView
          animate={{
            height: !params.useRandomSeed ? 49 : 0,
            opacity: !params.useRandomSeed ? 1 : 0,
          }}
          transition={{
            type: 'timing',
            duration: 200,
          }}
          className="overflow-hidden"
        >
          <HStack space="sm" className="mt-2 px-[0.5px]">
            <Input className="flex-1 overflow-hidden rounded-xl border-[0.5px] border-background-100">
              <InputField
                value={String(params.seed)}
                onChangeText={(value: string) => {
                  const num = Number(value);
                  if (!isNaN(num)) {
                    onParamsChange({ ...params, seed: num });
                  }
                }}
                keyboardType="numeric"
                placeholder="Seed"
                className="bg-background-50 px-3 py-2 text-sm text-primary-500"
              />
            </Input>
            <Button
              variant="outline"
              className="aspect-square h-[34px] rounded-xl border-[0.5px] border-background-100 bg-background-50 p-0"
              onPress={handleRandomSeed}
            >
              <MotiView
                animate={{ scaleY: [-1, 1] }}
                transition={{
                  type: 'timing',
                  duration: 150,
                }}
                key={params.seed}
                style={{ transform: [{ scale: 1 }] }}
              >
                <Icon as={Shuffle} size="xs" className="text-primary-500" />
              </MotiView>
            </Button>
          </HStack>
        </MotiView>
      </VStack>
    </VStack>
  );
}
