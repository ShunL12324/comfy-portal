import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { usePresetsStore } from '@/store/presets';
import { GenerationParams } from '@/types/generation';
import { AnimatePresence, MotiView } from 'moti';
import React, { useCallback, useRef, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { GenerationTab } from './tabs/generation';
import { ModelTab } from './tabs/model';
import { PromptTab } from './tabs/prompt';
import { SamplerTab } from './tabs/sampler';

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
      // clear the timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // set a new timer
      debounceTimerRef.current = setTimeout(() => {
        updatePreset(presetId, {
          params: newParams,
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
          className="px-2"
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
        className="rounded-t-2xl border-b-[1px] border-b-outline-100 bg-background-200"
      >
        <HStack className="bg-background-200 px-2">
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
                  className={`text-sm font-semibold ${
                    activeTab === tab.key
                      ? 'text-typography-900'
                      : 'text-typography-500'
                  }`}
                >
                  {tab.title}
                </Text>
                {activeTab === tab.key && (
                  <MotiView
                    from={{
                      opacity: 0,
                      scaleX: 0.6,
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
                    className="absolute bottom-0 left-5 right-5 mb-1 h-[2px] rounded-full bg-typography-900"
                  />
                )}
              </MotiView>
            </Pressable>
          ))}
        </HStack>
      </ScrollView>
      <View className="flex-1 bg-background-200">{renderContent()}</View>
    </VStack>
  );
}
