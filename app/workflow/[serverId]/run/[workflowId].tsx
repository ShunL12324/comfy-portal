import React, { useState } from 'react';
import { Dimensions } from 'react-native';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { ScrollView } from '@/components/ui/scroll-view';
import { Textarea, TextareaInput } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useLocalSearchParams } from 'expo-router';
import { useServersStore } from '@/store/servers';
import { useWorkflowsStore } from '@/store/workflows';
import { AppBar } from '@/components/layout/app-bar';
import { Icon } from '@/components/ui/icon';
import { Activity, Wand2, Shuffle, Plus, Minus } from 'lucide-react-native';
import { SegmentedControl } from '@/components/ui/segmented-control';
import {
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
} from '@/components/ui/slider';
import { TabControl } from '@/components/ui/tab-control';
import { MotiView, AnimatePresence } from 'moti';
import { Input, InputField } from '@/components/ui/input';
import { Image } from '@/components/ui/image';

const { width: screenWidth } = Dimensions.get('window');

const SAMPLERS = ['euler', 'euler_ancestral', 'dpmpp_3m_sde_gpu'] as const;
const SCHEDULERS = ['normal', 'karras', 'sgm_uniform'] as const;

interface Resolution {
  width: number;
  height: number;
  label?: string;
}

const RESOLUTIONS: readonly Resolution[] = [
  { width: 512, height: 512 },
  { width: 768, height: 768 },
  { width: 768, height: 1024 },
  { width: 0, height: 0, label: 'Custom' },
] as const;

interface GenerationParams {
  prompt: string;
  negativePrompt: string;
  steps: number;
  cfg: number;
  seed: number;
  width: number;
  height: number;
  sampler: (typeof SAMPLERS)[number];
  scheduler: (typeof SCHEDULERS)[number];
  useRandomSeed: boolean;
}

const TABS = ['Model', 'Prompt', 'Sampler', 'Generation'] as const;

export default function RunWorkflowScreen() {
  const { serverId, workflowId } = useLocalSearchParams();
  const server = useServersStore((state) =>
    state.servers.find((s) => s.id === serverId),
  );
  const workflow = useWorkflowsStore((state) =>
    state.workflows.find((w) => w.id === workflowId),
  );

  const [params, setParams] = useState<GenerationParams>({
    prompt: '',
    negativePrompt: '',
    steps: 30,
    cfg: 7,
    seed: Math.floor(Math.random() * Number.MAX_SAFE_INTEGER),
    width: 768,
    height: 1024,
    sampler: 'dpmpp_3m_sde_gpu',
    scheduler: 'sgm_uniform',
    useRandomSeed: true,
  });

  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>('Prompt');

  const handleGenerate = () => {
    // TODO: 实现图片生成逻辑
    console.log('Generating with params:', params);
  };

  const handleRandomSeed = () => {
    setParams({
      ...params,
      seed: Math.floor(Math.random() * Number.MAX_SAFE_INTEGER),
    });
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'Model':
        return (
          <VStack space="md" className="py-4">
            {/* Model Selection */}
            <VStack space="xs">
              <Text className="text-xs text-primary-400">Model</Text>
              <Button
                variant="outline"
                className="justify-start rounded-xl bg-background-50 px-3 py-2"
              >
                <Text className="text-sm text-primary-500">
                  everclearPNYByZovya_v3.safetensors
                </Text>
              </Button>
            </VStack>
          </VStack>
        );

      case 'Prompt':
        return (
          <VStack space="md" className="py-4">
            {/* 提示词输入 */}
            <VStack space="xs">
              <Text className="text-sm font-medium text-primary-400">
                Prompt
              </Text>
              <Textarea className="overflow-hidden rounded-xl border-[0.5px] border-background-100">
                <TextareaInput
                  value={params.prompt}
                  onChangeText={(value: string) =>
                    setParams({ ...params, prompt: value })
                  }
                  placeholder="Describe what you want to generate..."
                  className="min-h-[100] bg-background-50 px-3 py-2 text-sm text-primary-500 placeholder:text-primary-300"
                  multiline
                />
              </Textarea>
            </VStack>

            {/* 反向提示词输入 */}
            <VStack space="xs">
              <Text className="text-sm font-medium text-primary-400">
                Negative Prompt
              </Text>
              <Textarea className="overflow-hidden rounded-xl border-[0.5px] border-background-100">
                <TextareaInput
                  value={params.negativePrompt}
                  onChangeText={(value: string) =>
                    setParams({ ...params, negativePrompt: value })
                  }
                  placeholder="Describe what you don't want to see..."
                  className="min-h-[60] bg-background-50 px-3 py-2 text-sm text-primary-500 placeholder:text-primary-300"
                  multiline
                />
              </Textarea>
            </VStack>
          </VStack>
        );

      case 'Sampler':
        return (
          <VStack space="md" className="py-4">
            {/* Sampler */}
            <VStack space="xs">
              <Text className="text-xs text-primary-400">Sampler</Text>
              <SegmentedControl
                options={[...SAMPLERS]}
                value={params.sampler}
                onChange={(value: string) =>
                  setParams({
                    ...params,
                    sampler: value as (typeof SAMPLERS)[number],
                  })
                }
              />
            </VStack>

            {/* Scheduler */}
            <VStack space="xs">
              <Text className="text-xs text-primary-400">Scheduler</Text>
              <SegmentedControl
                options={[...SCHEDULERS]}
                value={params.scheduler}
                onChange={(value: string) =>
                  setParams({
                    ...params,
                    scheduler: value as (typeof SCHEDULERS)[number],
                  })
                }
              />
            </VStack>
          </VStack>
        );

      case 'Generation':
        return (
          <VStack space="md" className="py-4">
            {/* Resolution */}
            <VStack space="xs">
              <Text className="text-xs text-primary-400">Resolution</Text>
              <SegmentedControl
                options={RESOLUTIONS.map(
                  (r) => r.label || `${r.width}×${r.height}`,
                )}
                value={
                  params.width === 0
                    ? 'Custom'
                    : `${params.width}×${params.height}`
                }
                onChange={(value: string) => {
                  if (value === 'Custom') {
                    setParams({ ...params, width: 0, height: 0 });
                  } else {
                    const [width, height] = value.split('×').map(Number);
                    setParams({ ...params, width, height });
                  }
                }}
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
                          setParams({ ...params, width: num });
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
                          setParams({ ...params, height: num });
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

            {/* Steps */}
            <VStack space="xs">
              <HStack className="items-center justify-between">
                <Text className="text-xs text-primary-400">Steps</Text>
                <Text className="text-xs font-medium text-primary-500">
                  {params.steps}
                </Text>
              </HStack>
              <HStack space="sm" className="items-center">
                <Button
                  variant="outline"
                  className="h-8 w-8 rounded-xl bg-background-50 p-0"
                  onPress={() =>
                    setParams({
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
                  onChange={(value) => setParams({ ...params, steps: value })}
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
                    setParams({
                      ...params,
                      steps: Math.min(100, params.steps + 1),
                    })
                  }
                >
                  <Icon as={Plus} size="sm" className="text-primary-500" />
                </Button>
              </HStack>
            </VStack>

            {/* CFG Scale */}
            <VStack space="xs">
              <HStack className="items-center justify-between">
                <Text className="text-xs text-primary-400">CFG Scale</Text>
                <Text className="text-xs font-medium text-primary-500">
                  {params.cfg}
                </Text>
              </HStack>
              <HStack space="sm" className="items-center">
                <Button
                  variant="outline"
                  className="h-8 w-8 rounded-xl bg-background-50 p-0"
                  onPress={() =>
                    setParams({ ...params, cfg: Math.max(1, params.cfg - 0.5) })
                  }
                >
                  <Icon as={Minus} size="sm" className="text-primary-500" />
                </Button>
                <Slider
                  value={params.cfg}
                  minValue={1}
                  maxValue={20}
                  step={0.5}
                  onChange={(value) => setParams({ ...params, cfg: value })}
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
                    setParams({
                      ...params,
                      cfg: Math.min(20, params.cfg + 0.5),
                    })
                  }
                >
                  <Icon as={Plus} size="sm" className="text-primary-500" />
                </Button>
              </HStack>
            </VStack>

            {/* Seed */}
            <VStack space="xs">
              <Text className="text-xs text-primary-400">Seed</Text>
              <SegmentedControl
                options={['Random', 'Fixed']}
                value={params.useRandomSeed ? 'Random' : 'Fixed'}
                onChange={(value: string) =>
                  setParams({
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
                          setParams({ ...params, seed: num });
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
                      <Icon
                        as={Shuffle}
                        size="xs"
                        className="text-primary-500"
                      />
                    </MotiView>
                  </Button>
                </HStack>
              </MotiView>
            </VStack>
          </VStack>
        );
    }
  };

  if (!server || !workflow) {
    return (
      <VStack className="flex-1 items-center justify-center">
        <Text className="text-primary-300">
          {!server ? 'Server' : 'Workflow'} not found
        </Text>
      </VStack>
    );
  }

  return (
    <VStack className="flex-1 bg-background-0">
      <AppBar
        showBack
        title={workflow.name}
        rightElement={
          <HStack space="sm" className="items-center">
            <Text className="text-sm text-primary-400">{server.name}</Text>
            <HStack
              space="xs"
              className={`items-center rounded-lg px-2 py-1 ${
                server.status === 'online' ? 'bg-success-50' : 'bg-error-50'
              }`}
            >
              <Icon
                as={Activity}
                size="sm"
                className={
                  server.status === 'online'
                    ? 'text-success-600'
                    : 'text-error-600'
                }
              />
              <Text
                className={`text-xs font-medium ${
                  server.status === 'online'
                    ? 'text-success-700'
                    : 'text-error-700'
                }`}
              >
                {server.status === 'online' ? `${server.latency}ms` : 'Offline'}
              </Text>
            </HStack>
          </HStack>
        }
      />
      <ScrollView className="flex-1">
        <VStack className="pb-24 pt-20">
          {/* 图片预览区域 */}
          <VStack className="w-full bg-background-50 px-5">
            <MotiView
              animate={{
                height: Math.round(
                  (params.height / params.width) * (screenWidth - 40),
                ),
              }}
              transition={{
                type: 'spring',
                damping: 20,
                stiffness: 300,
              }}
              className="w-full overflow-hidden rounded-2xl border-[0.5px] border-background-100"
            >
              <VStack className="h-full w-full items-center justify-center">
                <Text className="text-sm text-primary-300">
                  {params.width}×{params.height}
                </Text>
              </VStack>
            </MotiView>
          </VStack>

          <TabControl
            tabs={[...TABS]}
            value={activeTab}
            onChange={(value) => setActiveTab(value as (typeof TABS)[number])}
          />
          <VStack className="px-5">{renderTabContent()}</VStack>
        </VStack>
      </ScrollView>
      {/* 生成按钮 */}
      <VStack className="absolute bottom-0 left-0 right-0 border-t-[0.5px] border-background-100 bg-background-0/80 px-5 pb-6 pt-4 backdrop-blur-md">
        <Button
          variant="solid"
          action="primary"
          onPress={handleGenerate}
          className="rounded-xl bg-primary-500 active:bg-primary-600"
        >
          <Icon as={Wand2} size="sm" className="mr-2 text-background-0" />
          <Text className="font-medium text-background-0">Generate</Text>
        </Button>
      </VStack>
    </VStack>
  );
}
