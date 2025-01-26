import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import {
  Animated,
  useWindowDimensions,
  View,
  Platform,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { History, Images, Maximize2 } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { VStack } from '@/components/ui/vstack';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { showToast } from '@/utils/toast';

import { useServersStore } from '@/store/servers';
import { usePresetsStore } from '@/store/presets';
import { ComfyClient } from '@/utils/comfy-client';
import { createPreset } from '@/utils/preset';
import { saveGeneratedImage, loadHistoryImages } from '@/utils/image-storage';

import { AppBar } from '@/components/layout/app-bar';
import { ServerStatus } from '@/components/preset-run/server-status';
import { ImagePreview } from '@/components/preset-run/image-preview';
import { ParameterControls } from '@/components/preset-run/parameter-controls';
import { GenerationButton } from '@/components/preset-run/generation-button';
import { HistoryDrawer } from '@/components/preset-run/history-drawer';
import { ParallaxImage } from '@/components/preset-run/parallax-image';

import { GenerationParams } from '@/types/generation';

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

  const [connectionStatus, setConnectionStatus] = useState<
    'idle' | 'generating'
  >('idle');
  const [params, setParams] = useState<GenerationParams>({
    model: 'everclearPNYByZovya_v3.safetensors',
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

  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState({ value: 0, max: 0 });
  const [nodeProgress, setNodeProgress] = useState({ completed: 0, total: 0 });
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

  const cleanup = useCallback(() => {
    if (progressCompleteTimeoutRef.current) {
      clearTimeout(progressCompleteTimeoutRef.current);
      progressCompleteTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => cleanup, [cleanup]);

  const debouncedSetProgress = useCallback((value: number, max: number) => {
    const now = Date.now();
    const timeDiff = now - lastProgressUpdateRef.current;
    const progressPercentage = (value / max) * 100;
    const lastProgressPercentage = (lastProgressValueRef.current / max) * 100;
    const progressDiff = Math.abs(progressPercentage - lastProgressPercentage);

    if (timeDiff >= 200 && (progressDiff >= 1 || value === max)) {
      setProgress({ value, max });
      lastProgressUpdateRef.current = now;
      lastProgressValueRef.current = value;
    }
  }, []);

  const debouncedSetNodeProgress = useCallback(
    (completed: number, total: number) => {
      const now = Date.now();
      const timeDiff = now - lastNodeProgressUpdateRef.current;
      if (
        timeDiff >= 200 &&
        (completed !== lastNodeProgressValueRef.current || completed === total)
      ) {
        setNodeProgress({ completed, total });
        lastNodeProgressUpdateRef.current = now;
        lastNodeProgressValueRef.current = completed;
      }
    },
    [],
  );

  useEffect(() => {
    if (preset?.content) {
      try {
        const savedParams = JSON.parse(preset.content);
        setParams(savedParams);
      } catch (error) {
        console.error('Failed to parse preset content:', error);
      }
    }
  }, [preset?.content]);

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
    setConnectionStatus(isGenerating ? 'generating' : 'idle');
  }, [isGenerating]);

  useEffect(() => {
    if (preset) {
      loadHistoryImages(preset.id).then(setHistoryImages);
    }
  }, [preset]);

  const handleGenerate = async () => {
    if (!comfyClient.current || !preset || !server) return;

    try {
      cleanup();
      setIsGenerating(true);
      setProgress({ value: 0, max: 0 });
      setNodeProgress({ completed: 0, total: 0 });

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
          setIsGenerating(false);
          setConnectionStatus('idle');
          return;
        }
      }

      const presetData = createPreset(params);
      await comfyClient.current.generate(presetData, {
        onProgress: (value, max) => {
          debouncedSetProgress(value, max);
          if (value > max * 0.9 && value < max) {
            cleanup();
            progressCompleteTimeoutRef.current = setTimeout(() => {
              setProgress({ value: max, max });
            }, 500);
          }
        },
        onNodeStart: () => {},
        onNodeComplete: (_, total, completed) =>
          debouncedSetNodeProgress(completed, total),
        onComplete: async (images) => {
          setProgress((prev) => ({ ...prev, value: prev.max }));
          await new Promise((resolve) => setTimeout(resolve, 300));

          if (images.length > 0) {
            const savedImage = await saveGeneratedImage({
              presetId: preset.id,
              imageUrl: images[0],
              params,
            });

            if (savedImage) {
              const localImageUrl = savedImage.path.startsWith('file://')
                ? savedImage.path
                : `file://${savedImage.path}`;
              setGeneratedImage(localImageUrl);
            } else {
              setGeneratedImage(images[0]);
            }

            const newHistoryImages = await loadHistoryImages(preset.id);
            setHistoryImages(newHistoryImages);
          }

          cleanup();
          setIsGenerating(false);
        },
        onError: () => {
          cleanup();
          setIsGenerating(false);
        },
      });
    } catch (error) {
      cleanup();
      setIsGenerating(false);
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
              presetId: preset.id,
              imageUrl: url,
              params,
              delete: true,
            }),
          ),
        );
      }
    },
    [generatedImage, historyImages, params, preset],
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
    <View className="flex-1 bg-background-0">
      <View style={{ zIndex: 20 }}>
        <AppBar
          showBack
          title={preset.name}
          centerElement={
            <ServerStatus generating={isGenerating} name={server.name} />
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
            isGenerating
              ? {
                  current: progress.value,
                  total: progress.max,
                }
              : undefined
          }
          isPreviewOpen={isPreviewOpen}
          onPreviewClose={() => setIsPreviewOpen(false)}
        />

        {generatedImage && (
          <TouchableOpacity
            activeOpacity={0.5}
            onPress={() => setIsPreviewOpen(true)}
            style={{
              position: 'absolute',
              top: 12,
              right: 12,
              backgroundColor: 'rgba(0,0,0,0.3)',
              borderRadius: 8,
              padding: 8,
              zIndex: 30,
            }}
          >
            <Icon as={Maximize2} size="sm" className="text-white" />
          </TouchableOpacity>
        )}

        <Animated.ScrollView
          className="flex-1"
          onScroll={handleScroll}
          scrollEventThrottle={16}
          bounces={true}
          contentContainerStyle={{
            paddingTop: imageHeight,
            minHeight: screenHeight,
          }}
          style={{ zIndex: 10 }}
          onScrollEndDrag={handleScrollEnd}
          scrollIndicatorInsets={{ top: imageHeight }}
          overScrollMode="never"
          showsVerticalScrollIndicator={false}
          automaticallyAdjustKeyboardInsets
        >
          <View
            className="bg-background-0"
            style={{
              zIndex: 10,
              minHeight: screenHeight - imageHeight,
            }}
          >
            <VStack space="lg" className="pb-24">
              <ParameterControls
                params={params}
                onParamsChange={setParams}
                presetId={preset.id}
              />
            </VStack>
          </View>
        </Animated.ScrollView>

        <View className="z-20 bg-background-0">
          <GenerationButton
            onGenerate={handleGenerate}
            isGenerating={isGenerating}
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
