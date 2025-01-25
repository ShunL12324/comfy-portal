import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { VStack } from '@/components/ui/vstack';
import { ScrollView } from '@/components/ui/scroll-view';
import { Text } from '@/components/ui/text';
import { useLocalSearchParams } from 'expo-router';
import { useServersStore } from '@/store/servers';
import { usePresetsStore } from '@/store/presets';
import { AppBar } from '@/components/layout/app-bar';
import { ComfyClient, ConnectionStatus } from '@/utils/comfy-client';
import { createPreset } from '@/utils/preset';
import { ServerStatus } from '@/components/preset-run/server-status';
import { ImagePreview } from '@/components/preset-run/image-preview';
import { ParameterControls } from '@/components/preset-run/parameter-controls';
import { GenerationButton } from '@/components/preset-run/generation-button';
import { HistoryDrawer } from '@/components/preset-run/history-drawer';
import { saveGeneratedImage, loadHistoryImages } from '@/utils/image-storage';
import { Animated, useWindowDimensions, View, Platform } from 'react-native';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { History } from 'lucide-react-native';

interface GenerationParams {
  model: string;
  prompt: string;
  negativePrompt: string;
  steps: number;
  cfg: number;
  seed: number;
  width: number;
  height: number;
  sampler: 'euler' | 'euler_ancestral' | 'dpmpp_3m_sde_gpu';
  scheduler: 'normal' | 'karras' | 'sgm_uniform';
  useRandomSeed: boolean;
}

// Separate the parallax image component to prevent unnecessary re-renders
const ParallaxImage = memo(function ParallaxImage({
  scrollY,
  imageHeight,
  imageUrl,
  progress,
}: {
  scrollY: Animated.Value;
  imageHeight: number;
  imageUrl?: string;
  progress?: { current: number; total: number };
}) {
  const scale = scrollY.interpolate({
    inputRange: [-imageHeight, 0],
    outputRange: [1.5, 1],
    extrapolate: 'clamp',
  });

  const translateY = scrollY.interpolate({
    inputRange: [-imageHeight, 0, imageHeight],
    outputRange: [0, 0, -imageHeight / 3],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: imageHeight,
        zIndex: 1,
        overflow: 'hidden',
      }}
    >
      <Animated.View
        style={{
          height: imageHeight,
          transform: [{ scale }, { translateY }],
        }}
      >
        <ImagePreview imageUrl={imageUrl} progress={progress} />
      </Animated.View>
    </Animated.View>
  );
});

export default function RunPresetScreen() {
  const { serverId, presetId } = useLocalSearchParams();
  const server = useServersStore((state) =>
    state.servers.find((s) => s.id === serverId),
  );
  const preset = usePresetsStore((state) =>
    state.presets.find((p) => p.id === presetId),
  );

  // 使用本地状态管理连接状态
  const [connectionStatus, setConnectionStatus] = useState<
    'online' | 'offline' | 'generating'
  >('offline');

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

  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState({ value: 0, max: 0 });
  const [nodeProgress, setNodeProgress] = useState({ completed: 0, total: 0 });
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const comfyClient = useRef<ComfyClient | null>(null);

  const { height: screenHeight } = useWindowDimensions();
  const scrollY = useRef(new Animated.Value(0)).current;
  const imageHeight = screenHeight * 0.6;

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyImages, setHistoryImages] = useState<
    Array<{
      url: string;
      timestamp: number;
    }>
  >([]);

  // 使用 useRef 来存储上一次更新的时间和值
  const lastProgressUpdateRef = useRef(Date.now());
  const lastProgressValueRef = useRef(0);
  const lastNodeProgressUpdateRef = useRef(Date.now());
  const lastNodeProgressValueRef = useRef(0);
  const progressCompleteTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 使用 useCallback 包装更新函数
  const debouncedSetProgress = useCallback((value: number, max: number) => {
    const now = Date.now();
    // 确保两次更新之间至少间隔 200ms，且进度变化超过 1%
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
      // 确保两次更新之间至少间隔 200ms，且节点进度有变化
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

  // 清理函数
  const cleanup = useCallback(() => {
    if (progressCompleteTimeoutRef.current) {
      clearTimeout(progressCompleteTimeoutRef.current);
      progressCompleteTimeoutRef.current = null;
    }
  }, []);

  // 组件卸载时清理
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  useEffect(() => {
    if (server) {
      comfyClient.current = new ComfyClient({
        serverAddress: `${server.host}:${server.port}`,
      });

      comfyClient.current.setOnStatusChange((status) => {
        if (!isGenerating) {
          setConnectionStatus(status === 'connected' ? 'online' : 'offline');
        }
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

  // 监听生成状态变化
  useEffect(() => {
    if (isGenerating) {
      setConnectionStatus('generating');
    } else if (comfyClient.current?.isConnected()) {
      setConnectionStatus('online');
    } else {
      setConnectionStatus('offline');
    }
  }, [isGenerating]);

  useEffect(() => {
    if (preset) {
      loadHistoryImages(preset.id).then(setHistoryImages);
    }
  }, [preset]);

  const handleGenerate = async () => {
    if (!comfyClient.current || !preset || !server) return;

    try {
      cleanup(); // 清理之前可能存在的timeout
      setConnectionStatus('generating');
      setIsGenerating(true);
      setProgress({ value: 0, max: 0 });
      setNodeProgress({ completed: 0, total: 0 });

      if (!comfyClient.current.isConnected()) {
        try {
          await comfyClient.current.connect();
        } catch (error) {
          setIsGenerating(false);
          setConnectionStatus('offline');
          return;
        }
      }

      const presetData = createPreset(params);
      const images = await comfyClient.current.generate(presetData, {
        onProgress: (value, max) => {
          debouncedSetProgress(value, max);
          // 如果进度接近完成但还未到100%，强制更新到100%
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
          // 确保进度条显示完成
          setProgress((prev) => ({ ...prev, value: prev.max }));

          // 等待一小段时间再更新图片，确保进度条动画完成
          await new Promise((resolve) => setTimeout(resolve, 300));

          if (images.length > 0) {
            setGeneratedImage(images[0]);
            await saveGeneratedImage({
              presetId: preset.id,
              imageUrl: images[0],
              params,
            });
            const newHistoryImages = await loadHistoryImages(preset.id);
            setHistoryImages(newHistoryImages);
          }

          cleanup();
          setIsGenerating(false);
          setConnectionStatus(
            comfyClient.current?.isConnected() ? 'online' : 'offline',
          );
        },
        onError: () => {
          cleanup();
          setIsGenerating(false);
          setConnectionStatus(
            comfyClient.current?.isConnected() ? 'online' : 'offline',
          );
        },
      });
    } catch (error) {
      cleanup();
      setIsGenerating(false);
      setConnectionStatus(
        comfyClient.current?.isConnected() ? 'online' : 'offline',
      );
    }
  };

  const handleSelectHistoryImage = (url: string) => {
    setGeneratedImage(url);
    setIsHistoryOpen(false);
  };

  const handleDeleteImages = async (urls: string[]) => {
    // Delete images from history
    const newHistoryImages = historyImages.filter(
      (img) => !urls.includes(img.url),
    );
    setHistoryImages(newHistoryImages);

    // If the currently displayed image is being deleted, clear it
    if (generatedImage && urls.includes(generatedImage)) {
      setGeneratedImage(null);
    }

    // Delete images from storage
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
  };

  // Optimize scroll event handling
  const handleScroll = useCallback(
    Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
      useNativeDriver: true,
    }),
    [scrollY],
  );

  // Optimize scroll end handling
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
            <ServerStatus
              connected={connectionStatus === 'online'}
              generating={isGenerating}
              name={server.name}
            />
          }
          rightElement={
            <Button
              variant="link"
              className="h-9 w-9 rounded-xl p-0"
              onPress={() => setIsHistoryOpen(true)}
            >
              <Icon as={History} size="md" className="text-primary-500" />
            </Button>
          }
        />
      </View>

      {/* Parallax Container */}
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
        />

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
          {/* Content Container */}
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
            isServerOnline={connectionStatus === 'online'}
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
