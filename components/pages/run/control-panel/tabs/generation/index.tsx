import { SegmentedControl } from '@/components/self-ui/segmented-control';
import { SmoothSlider } from '@/components/self-ui/smooth-slider';
import { Button } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Input, InputField } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { RESOLUTIONS, TabProps } from '@/types/generation';
import { showToast } from '@/utils/toast';
import { Dices, Info, Minus, Plus } from 'lucide-react-native';
import { MotiView } from 'moti';
import React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Constants for dimension validation
 */
const MIN_DIMENSION = 50;
const MAX_DIMENSION = 10240;

/**
 * GenerationTab component handles image generation parameters including resolution,
 * steps, CFG scale, and seed settings.
 */
export function GenerationTab({ params, onParamsChange }: TabProps) {
  const insets = useSafeAreaInsets();
  const [shakeKey, setShakeKey] = React.useState(0);

  // Local state for smooth slider interactions
  const [localSteps, setLocalSteps] = React.useState(params.steps);
  const [localCfg, setLocalCfg] = React.useState(params.cfg);
  const [displayClipLayer, setDisplayClipLayer] = React.useState(-2);

  // Resolution states
  const [isCustom, setIsCustom] = React.useState(() => {
    const matchedResolution = RESOLUTIONS.find(
      (r) => r.width === params.width && r.height === params.height,
    );
    return !matchedResolution;
  });
  const [localWidth, setLocalWidth] = React.useState(
    String(params.width || ''),
  );
  const [localHeight, setLocalHeight] = React.useState(
    String(params.height || ''),
  );

  /**
   * Validates if a dimension value is within acceptable range
   */
  const isValidDimension = (value: number): boolean => {
    return value >= MIN_DIMENSION && value <= MAX_DIMENSION;
  };

  /**
   * Validates and updates dimension values when input loses focus
   * Shows toast messages for out-of-range values and adjusts them accordingly
   */
  const validateAndUpdateDimension = (
    value: string,
    dimension: 'width' | 'height',
  ): void => {
    const num = Number(value);
    if (!isNaN(num)) {
      let finalValue = num;

      if (finalValue !== 0) {
        if (finalValue < MIN_DIMENSION) {
          finalValue = MIN_DIMENSION;
          showToast.info(
            'Resolution adjusted',
            `Minimum ${dimension} is ${MIN_DIMENSION}px`,
            insets.top,
          );
        } else if (finalValue > MAX_DIMENSION) {
          finalValue = MAX_DIMENSION;
          showToast.info(
            'Resolution adjusted',
            `Maximum ${dimension} is ${MAX_DIMENSION}px`,
            insets.top,
          );
        }
      }

      onParamsChange({
        ...params,
        [dimension]: finalValue,
      });

      if (dimension === 'width') {
        setLocalWidth(String(finalValue));
      } else {
        setLocalHeight(String(finalValue));
      }
    }
  };

  /**
   * Synchronize local state with external parameter changes
   */
  React.useEffect(() => {
    setLocalSteps(params.steps);
    setLocalCfg(params.cfg);
    setLocalWidth(String(params.width || ''));
    setLocalHeight(String(params.height || ''));
    if (typeof params.stopAtClipLayer === 'number') {
      setDisplayClipLayer(params.stopAtClipLayer);
    }
  }, [
    params.steps,
    params.cfg,
    params.width,
    params.height,
    params.stopAtClipLayer,
  ]);

  /**
   * Update custom resolution state when dimensions change
   */
  React.useEffect(() => {
    const matchedResolution = RESOLUTIONS.find(
      (r) => r.width === params.width && r.height === params.height,
    );
    setIsCustom(!matchedResolution);
  }, [params.width, params.height]);

  /**
   * Generates a random seed for image generation
   */
  const handleRandomSeed = (): void => {
    setShakeKey((prev) => prev + 1);
    onParamsChange({
      ...params,
      seed: Math.floor(Math.random() * Number.MAX_SAFE_INTEGER),
    });
  };

  /**
   * Gets the current resolution display value for the segmented control
   */
  const getCurrentResolution = (): string => {
    if (isCustom) return 'Custom';
    const matchedResolution = RESOLUTIONS.find(
      (r) =>
        r.width === params.width &&
        r.height === params.height &&
        r.label !== 'Custom',
    );
    return matchedResolution
      ? matchedResolution.label ||
          `${matchedResolution.width}×${matchedResolution.height}`
      : 'Custom';
  };

  /**
   * Handles resolution selection changes in the segmented control
   */
  const handleResolutionChange = (value: string): void => {
    if (value === 'Custom') {
      setIsCustom(true);
    } else {
      setIsCustom(false);
      const [width, height] = value.split('×').map(Number);
      onParamsChange({ ...params, width, height });
      setLocalWidth(String(width));
      setLocalHeight(String(height));
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
          value={getCurrentResolution()}
          onChange={handleResolutionChange}
        />
        <MotiView
          animate={{
            height: isCustom ? 49 : 0,
            opacity: isCustom ? 1 : 0,
          }}
          transition={{
            type: 'timing',
            duration: 200,
          }}
          className="overflow-hidden"
        >
          <HStack space="sm" className="mt-2 px-[0.5px]">
            <Input
              isInvalid={params.width !== 0 && !isValidDimension(params.width)}
              className="flex-1 overflow-hidden rounded-lg border-0 bg-background-50 focus:border-[0.5px] focus:border-background-100"
            >
              <InputField
                value={localWidth}
                onChangeText={setLocalWidth}
                onBlur={() => validateAndUpdateDimension(localWidth, 'width')}
                keyboardType="numeric"
                placeholder="Width (50-10240)"
                className="p-3 text-sm text-primary-500"
              />
            </Input>
            <Input
              isInvalid={
                params.height !== 0 && !isValidDimension(params.height)
              }
              className="flex-1 overflow-hidden rounded-lg border-0 bg-background-50 focus:border-[0.5px] focus:border-background-100"
            >
              <InputField
                value={localHeight}
                onChangeText={setLocalHeight}
                onBlur={() => validateAndUpdateDimension(localHeight, 'height')}
                keyboardType="numeric"
                placeholder="Height (50-10240)"
                className="p-3 text-sm text-primary-500"
              />
            </Input>
          </HStack>
        </MotiView>
      </VStack>

      <VStack space="sm">
        <Text className="text-base font-medium text-primary-500">Steps</Text>
        <HStack space="sm" className="mt-2 items-center">
          <Button
            className="h-8 w-8 rounded-lg bg-background-50 p-0"
            onPress={() =>
              onParamsChange({
                ...params,
                steps: Math.max(1, params.steps - 1),
              })
            }
          >
            <Icon as={Minus} size="sm" className="text-primary-500" />
          </Button>
          <SmoothSlider
            value={localSteps}
            minValue={1}
            maxValue={100}
            step={1}
            onChange={setLocalSteps}
            onChangeEnd={(value) => onParamsChange({ ...params, steps: value })}
            className="flex-1"
          />
          <Button
            className="h-8 w-8 rounded-lg bg-background-50 p-0"
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
        <Text className="text-base font-medium text-primary-500">
          CFG Scale
        </Text>
        <HStack space="sm" className="mt-2 items-center">
          <Button
            className="h-8 w-8 rounded-lg bg-background-50 p-0"
            onPress={() =>
              onParamsChange({
                ...params,
                cfg: Math.max(1, params.cfg - 0.5),
              })
            }
          >
            <Icon as={Minus} size="sm" className="text-primary-500" />
          </Button>
          <SmoothSlider
            value={localCfg}
            minValue={1}
            maxValue={20}
            step={0.5}
            onChange={setLocalCfg}
            onChangeEnd={(value) => onParamsChange({ ...params, cfg: value })}
            className="flex-1"
          />
          <Button
            className="h-8 w-8 rounded-lg bg-background-50 p-0"
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

      {/* CLIP Layer Section */}
      <VStack space="sm">
        <HStack space="sm" className="items-center justify-between">
          <Text className="text-base font-medium text-primary-500">
            CLIP Layer
          </Text>
          <Text className="text-sm text-typography-400">Advanced</Text>
        </HStack>
        <HStack space="sm" className="mt-2 items-center">
          <Button
            className="h-8 w-8 rounded-lg bg-background-50 p-0"
            onPress={() => {
              const currentValue =
                typeof params.stopAtClipLayer === 'number'
                  ? params.stopAtClipLayer
                  : -2;
              const newValue = Math.max(-24, currentValue - 1);
              onParamsChange({
                ...params,
                stopAtClipLayer: newValue,
              });
            }}
          >
            <Icon as={Minus} size="sm" className="text-primary-500" />
          </Button>
          <Text className="flex-1 text-center text-sm text-typography-500">
            {displayClipLayer}
          </Text>
          <Button
            className="h-8 w-8 rounded-lg bg-background-50 p-0"
            onPress={() => {
              const currentValue =
                typeof params.stopAtClipLayer === 'number'
                  ? params.stopAtClipLayer
                  : -2;
              const newValue = Math.min(-1, currentValue + 1);
              onParamsChange({
                ...params,
                stopAtClipLayer: newValue,
              });
            }}
          >
            <Icon as={Plus} size="sm" className="text-primary-500" />
          </Button>
        </HStack>
        <View className="flex-row justify-start gap-1 px-1">
          <Icon as={Info} className="mt-0.5 h-3 w-3 text-typography-400" />
          <Text className="flex-1 text-xs text-typography-400">
            Controls which CLIP layer to stop at. Range from -24 to -1. The
            value will affect how the model interprets your prompts. For
            pony-based models, usually use -2 is recommended.
          </Text>
        </View>
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
          className="mt-2 h-auto gap-2"
        >
          <HStack space="sm">
            <Input className="flex-1 overflow-hidden rounded-lg border-0 border-background-100">
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
                className="border-0 bg-background-50 px-3 py-2 text-sm text-primary-500"
              />
            </Input>
            <Button
              className="aspect-square h-[34px] rounded-lg border-0 border-background-100 bg-background-50 p-0"
              onPress={handleRandomSeed}
            >
              <MotiView
                key={shakeKey}
                animate={{
                  translateX: 0,
                }}
                transition={{
                  type: 'spring',
                  stiffness: 1000,
                  damping: 10,
                  mass: 0.3,
                }}
                from={{
                  translateX: 5,
                }}
              >
                <Icon as={Dices} size="xs" className="text-primary-500" />
              </MotiView>
            </Button>
          </HStack>
          <HStack space="sm" className="items-center px-1 pb-2">
            <Icon as={Info} className="h-3 w-3 text-typography-400" />
            <Text className="text-xs text-typography-400">
              Using the same seed will not start a new generation
            </Text>
          </HStack>
        </MotiView>
      </VStack>
    </VStack>
  );
}
