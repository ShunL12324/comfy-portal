import { useLocalSearchParams } from 'expo-router';
import { Images } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Pressable, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { showToast } from '@/utils/toast';

import { usePresetsStore } from '@/store/presets';
import { useServersStore } from '@/store/servers';
import { ComfyClient } from '@/utils/comfy-client';
import { loadHistoryImages, saveGeneratedImage } from '@/utils/image-storage';

import { AppBar } from '@/components/layout/app-bar';
import { ParameterControls } from '@/components/pages/run/control-panel';
import { GenerationButton } from '@/components/pages/run/generation-button';
import { ServerStatus } from '@/components/pages/run/generation-status-indicator';
import { HistoryDrawer } from '@/components/pages/run/history-drawer';
import { ParallaxImage } from '@/components/pages/run/parallax-image';

import { GenerationParams } from '@/types/generation';

interface GenerationState {
  status: 'idle' | 'generating' | 'downloading';
  progress: { value: number; max: number };
  nodeProgress: { completed: number; total: number };
  downloadProgress: number;
}

const DEFAULT_PARAMS: GenerationParams = {
  model: '',
  prompt: '',
  negativePrompt: '',
  steps: 30,
  cfg: 7,
  seed: Math.floor(Math.random() * Number.MAX_SAFE_INTEGER),
  width: 768,
  height: 1024,
  stopAtClipLayer: -2,
  sampler: 'euler_ancestral',
  scheduler: 'sgm_uniform',
  useRandomSeed: true,
};

/**
 * Screen component for running image generation presets
 * Features:
 * - Parameter controls for customizing generation
 * - Real-time progress tracking
 * - Image preview with parallax scrolling
 * - Generation history management
 */
export default function RunPresetScreen() {
  const { serverId, presetId } = useLocalSearchParams();
  const server = useServersStore((state) =>
    state.servers.find((s) => s.id === serverId),
  );
  const preset = usePresetsStore((state) =>
    state.presets.find((p) => p.id === presetId),
  );

  const [generationState, setGenerationState] = useState<GenerationState>({
    status: 'idle',
    progress: { value: 0, max: 0 },
    nodeProgress: { completed: 0, total: 0 },
    downloadProgress: 0,
  });

  const [params, setParams] = useState<GenerationParams>(() => ({
    ...DEFAULT_PARAMS,
    ...(preset?.params || {}),
  }));

  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [historyImages, setHistoryImages] = useState<
    Array<{ url: string; timestamp: number }>
  >([]);

  const comfyClient = useRef<ComfyClient | null>(null);
  const { height: screenHeight } = useWindowDimensions();
  const scrollY = useRef(new Animated.Value(0)).current;
  const imageHeight = screenHeight * 0.6;

  const lastProgressUpdateRef = useRef(Date.now());
  const lastProgressValueRef = useRef(0);
  const lastNodeProgressUpdateRef = useRef(Date.now());
  const lastNodeProgressValueRef = useRef(0);
  const progressCompleteTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const insets = useSafeAreaInsets();

  const updateProgressDebounced = useCallback(
    (type: 'progress' | 'nodeProgress', value: number, max: number) => {
      const now = Date.now();
      const ref =
        type === 'progress' ? lastProgressUpdateRef : lastNodeProgressUpdateRef;
      const valueRef =
        type === 'progress' ? lastProgressValueRef : lastNodeProgressValueRef;

      const timeDiff = now - ref.current;
      const percentage = (value / max) * 100;
      const lastPercentage = (valueRef.current / max) * 100;
      const progressDiff = Math.abs(percentage - lastPercentage);

      if (timeDiff >= 200 && (progressDiff >= 1 || value === max)) {
        setGenerationState((prev) => ({
          ...prev,
          [type]:
            type === 'progress'
              ? { value, max }
              : { completed: value, total: max },
        }));
        ref.current = now;
        valueRef.current = value;
      }
    },
    [],
  );

  const resetGeneration = useCallback(() => {
    if (progressCompleteTimeoutRef.current) {
      clearTimeout(progressCompleteTimeoutRef.current);
      progressCompleteTimeoutRef.current = null;
    }
    setGenerationState({
      status: 'idle',
      progress: { value: 0, max: 0 },
      nodeProgress: { completed: 0, total: 0 },
      downloadProgress: 0,
    });
  }, []);

  useEffect(() => {
    if (preset?.params) {
      setParams(preset.params);
    }
  }, [preset?.params]);

  useEffect(() => {
    if (server) {
      comfyClient.current = new ComfyClient({
        serverAddress: `${server.host}:${server.port}`,
      });

      const connectWithRetry = async (retries = 3) => {
        for (let i = 0; i < retries; i++) {
          try {
            await comfyClient.current?.connect();
            return;
          } catch (error) {
            if (i < retries - 1) {
              await new Promise((resolve) =>
                setTimeout(resolve, 1000 * Math.pow(2, i)),
              );
            }
          }
        }
      };

      connectWithRetry().catch(console.error);
    }

    return () => {
      comfyClient.current?.disconnect();
    };
  }, [server?.id]);

  useEffect(() => {
    if (preset) {
      loadHistoryImages(serverId as string, preset.id).then(setHistoryImages);
    }
  }, [preset, serverId]);

  const handleGenerate = async () => {
    if (!comfyClient.current || !preset || !server) return;

    try {
      resetGeneration();
      setGenerationState((prev) => ({ ...prev, status: 'generating' }));

      if (!comfyClient.current.isConnected()) {
        try {
          await comfyClient.current.connect();
        } catch (error) {
          console.error('Failed to connect to server:', error);
          showToast.error(
            'Connection Failed',
            'Unable to connect to server. Please check your server status.',
            insets.top + 8,
          );
          resetGeneration();
          return;
        }
      }

      await comfyClient.current.generate(params, {
        onProgress: (value, max) => {
          updateProgressDebounced('progress', value, max);
          if (value > max * 0.9 && value < max) {
            if (progressCompleteTimeoutRef.current) {
              clearTimeout(progressCompleteTimeoutRef.current);
            }
            progressCompleteTimeoutRef.current = setTimeout(() => {
              setGenerationState((prev) => ({
                ...prev,
                progress: { value: max, max },
              }));
            }, 500);
          }
        },
        onNodeStart: () => {},
        onNodeComplete: (_, total, completed) =>
          updateProgressDebounced('nodeProgress', completed, total),
        onDownloadProgress: (_, progress) => {
          if (progress === 0) {
            setGenerationState((prev) => ({
              ...prev,
              status: 'downloading',
              downloadProgress: 0,
            }));
          } else {
            setGenerationState((prev) => ({
              ...prev,
              downloadProgress: progress,
            }));
          }
        },
        onComplete: async (images) => {
          usePresetsStore.getState().updateUsage(preset.id);
          setGenerationState((prev) => ({
            ...prev,
            progress: { ...prev.progress, value: prev.progress.max },
          }));

          await new Promise((resolve) => setTimeout(resolve, 300));

          if (images.length > 0) {
            const result = await saveGeneratedImage({
              serverId: serverId as string,
              presetId: preset.id,
              imageUrl: images[0],
              params: params,
            });

            if (result) {
              const localImageUrl = result.path.startsWith('file://')
                ? result.path
                : `file://${result.path}`;

              setGeneratedImage(localImageUrl);
              const newHistoryImages = await loadHistoryImages(
                serverId as string,
                preset.id,
              );
              setHistoryImages(newHistoryImages);
            } else {
              console.error('Failed to save generated image');
              showToast.error(
                'Save Failed',
                'Unable to save the generated image.',
                insets.top + 8,
              );
            }
          }

          resetGeneration();
        },
        onError: resetGeneration,
      });
    } catch (error) {
      resetGeneration();
    }
  };

  const handleSelectHistoryImage = useCallback((url: string) => {
    setGeneratedImage(url);
    setIsHistoryOpen(false);
  }, []);

  const handleDeleteImages = useCallback(
    async (urls: string[]) => {
      const newHistoryImages = historyImages.filter(
        (img) => !urls.includes(img.url),
      );
      setHistoryImages(newHistoryImages);

      if (generatedImage && urls.includes(generatedImage)) {
        setGeneratedImage(null);
      }

      if (preset) {
        await Promise.all(
          urls.map((url) =>
            saveGeneratedImage({
              serverId: serverId as string,
              presetId: preset.id,
              imageUrl: url,
              params,
              delete: true,
            }),
          ),
        );
      }
    },
    [generatedImage, historyImages, params, preset, serverId],
  );

  const handleScroll = useCallback(
    Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
      useNativeDriver: true,
    }),
    [scrollY],
  );

  const handleScrollEnd = useCallback(
    (event: any) => {
      const y = event.nativeEvent.contentOffset.y;
      if (y < -imageHeight) {
        scrollY.setValue(-imageHeight);
      }
    },
    [imageHeight, scrollY],
  );

  if (!server || !preset) {
    return (
      <VStack className="flex-1 items-center justify-center">
        <Text className="text-primary-300">
          {!server ? 'Server' : 'Preset'} not found
        </Text>
      </VStack>
    );
  }

  return (
    <View className="flex-1 bg-background-200">
      <View style={{ zIndex: 20 }}>
        <AppBar
          showBack
          title={preset.name}
          centerElement={
            <ServerStatus
              generating={generationState.status === 'generating'}
              downloading={generationState.status === 'downloading'}
              downloadProgress={generationState.downloadProgress}
              generationProgress={generationState.progress}
              name={server.name}
            />
          }
          rightElement={
            <Button
              variant="link"
              className="h-9 w-9 rounded-xl p-0"
              onPress={() => setIsHistoryOpen(true)}
            >
              <Icon as={Images} size="md" className="text-primary-500" />
            </Button>
          }
        />
      </View>

      <View style={{ flex: 1 }}>
        <ParallaxImage
          scrollY={scrollY}
          imageHeight={imageHeight}
          imageUrl={generatedImage || undefined}
          progress={
            generationState.status === 'generating'
              ? {
                  current: generationState.progress.value,
                  total: generationState.progress.max,
                }
              : undefined
          }
          isPreviewOpen={isPreviewOpen}
          onPreviewClose={() => setIsPreviewOpen(false)}
          presetId={preset.id}
          serverId={serverId as string}
        />

        <Animated.ScrollView
          className="z-10 flex-1"
          onScroll={handleScroll}
          scrollEventThrottle={16}
          bounces={true}
          contentContainerStyle={{
            minHeight: screenHeight,
          }}
          style={{ zIndex: 10 }}
          onScrollEndDrag={handleScrollEnd}
          scrollIndicatorInsets={{ top: imageHeight }}
          overScrollMode="never"
          showsVerticalScrollIndicator={false}
          automaticallyAdjustKeyboardInsets
        >
          {/* Placeholder for parallax image area */}
          <Pressable
            style={{ height: imageHeight }}
            className="z-10 w-full"
            disabled={!generatedImage}
            onPress={() => {
              if (generatedImage) {
                setIsPreviewOpen(true);
              }
            }}
          />

          <View className="z-10 h-full pb-24">
            <ParameterControls
              params={params}
              onParamsChange={setParams}
              presetId={preset.id}
              serverId={serverId as string}
            />
          </View>
        </Animated.ScrollView>

        <View className="z-20">
          <GenerationButton
            onGenerate={handleGenerate}
            isGenerating={generationState.status === 'generating'}
            isServerOnline={true}
          />
        </View>
      </View>

      <HistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        images={historyImages}
        onSelectImage={handleSelectHistoryImage}
        onDeleteImages={handleDeleteImages}
      />
    </View>
  );
}
