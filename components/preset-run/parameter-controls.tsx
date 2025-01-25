import React, { useState, useCallback, useRef, useMemo } from 'react';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Input, InputField } from '@/components/ui/input';
import { Textarea, TextareaInput } from '@/components/ui/textarea';
import {
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
} from '@/components/ui/slider';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Plus, Minus, Shuffle, ChevronDown } from 'lucide-react-native';
import { MotiView, AnimatePresence } from 'moti';
import {
  KeyboardAvoidingView,
  useWindowDimensions,
  View,
  Text as RNText,
  Pressable,
  ScrollView,
} from 'react-native';
import { usePresetsStore } from '@/store/presets';
import { useServersStore } from '@/store/servers';
import {
  BottomSheetModal,
  BottomSheetFlatList,
  BottomSheetView,
  BottomSheetBackdrop,
  BottomSheetHandle,
} from '@gorhom/bottom-sheet';
import { tva } from '@gluestack-ui/nativewind-utils/tva';
import { StyleSheet } from 'react-native';
import { ModelPreview } from './model-preview';
import { ModelTab } from './tabs/model-tab';
import { PromptTab } from './tabs/prompt-tab';
import { SamplerTab } from './tabs/sampler-tab';
import { GenerationTab } from './tabs/generation-tab';
import { GenerationParams } from './types';

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

interface ParameterControlsProps {
  params: GenerationParams;
  onParamsChange: (params: GenerationParams) => void;
  presetId: string;
}

export function ParameterControls({
  params,
  onParamsChange,
  presetId,
}: ParameterControlsProps) {
  const updatePreset = usePresetsStore((state) => state.updatePreset);
  const servers = useServersStore((state) => state.servers);
  const checkpointModels = servers.flatMap((server, serverIndex) =>
    (server.models || [])
      .filter((model) => model.type === 'checkpoints')
      .map((model, modelIndex) => ({
        label: `${model.name} (${server.name})`,
        value: model.name,
        key: `${server.id}_${model.type}_${serverIndex}_${modelIndex}_${model.name}`,
      }))
      // Remove duplicates based on model name and server name
      .filter(
        (model, index, self) =>
          index === self.findIndex((m) => m.label === model.label),
      ),
  );
  const [activeTab, setActiveTab] = useState<
    'model' | 'prompt' | 'sampler' | 'generation'
  >('prompt');
  const debounceTimerRef = useRef<NodeJS.Timeout>();

  const tabs = [
    { key: 'model', title: 'Model' },
    { key: 'prompt', title: 'Prompt' },
    { key: 'sampler', title: 'Sampler' },
    { key: 'generation', title: 'Generation' },
  ] as const;

  const handleParamsChange = useCallback(
    (newParams: GenerationParams) => {
      onParamsChange(newParams);

      // Clear existing timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Set new timer
      debounceTimerRef.current = setTimeout(() => {
        updatePreset(presetId, {
          content: JSON.stringify(newParams),
        });
      }, 500);
    },
    [onParamsChange, presetId, updatePreset],
  );

  const renderContent = () => {
    const content = (() => {
      switch (activeTab) {
        case 'model':
          return (
            <ModelTab params={params} onParamsChange={handleParamsChange} />
          );
        case 'prompt':
          return (
            <PromptTab params={params} onParamsChange={handleParamsChange} />
          );
        case 'sampler':
          return (
            <SamplerTab params={params} onParamsChange={handleParamsChange} />
          );
        case 'generation':
          return (
            <GenerationTab
              params={params}
              onParamsChange={handleParamsChange}
            />
          );
      }
    })();

    return (
      <AnimatePresence exitBeforeEnter>
        <MotiView
          key={activeTab}
          from={{
            opacity: 0,
            translateX: 15,
          }}
          animate={{
            opacity: 1,
            translateX: 0,
          }}
          exit={{
            opacity: 0,
            translateX: -15,
          }}
          transition={{
            type: 'timing',
            duration: 150,
          }}
        >
          {content}
        </MotiView>
      </AnimatePresence>
    );
  };

  return (
    <VStack className="px-0">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="border-b-[0.5px] border-b-background-100"
      >
        <HStack className="px-2">
          {tabs.map((tab) => (
            <Pressable
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              className="relative"
            >
              <MotiView
                animate={{
                  scale: activeTab === tab.key ? 1 : 0.98,
                }}
                transition={{
                  type: 'spring',
                  damping: 20,
                  stiffness: 300,
                }}
                className="px-5 py-4"
              >
                <Text
                  className={`text-[15px] font-medium ${
                    activeTab === tab.key
                      ? 'text-primary-500'
                      : 'text-background-400'
                  }`}
                >
                  {tab.title}
                </Text>
                {activeTab === tab.key && (
                  <MotiView
                    from={{
                      opacity: 0,
                      scaleX: 0.9,
                    }}
                    animate={{
                      opacity: 1,
                      scaleX: 1,
                    }}
                    transition={{
                      type: 'spring',
                      damping: 20,
                      stiffness: 300,
                    }}
                    className="absolute bottom-0 left-5 right-5 h-[2px] rounded-full bg-primary-500"
                  />
                )}
              </MotiView>
            </Pressable>
          ))}
        </HStack>
      </ScrollView>
      <View className="flex-1">{renderContent()}</View>
    </VStack>
  );
}
