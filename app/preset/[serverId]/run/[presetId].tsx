import { useLocalSearchParams, useRouter } from 'expo-router';
import { Images, Wand2 } from 'lucide-react-native';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDebouncedCallback } from 'use-debounce';

import { Button, ButtonIcon, ButtonText } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { showToast } from '@/utils/toast';

import { usePresetsStore } from '@/store/presets';
import { useServersStore } from '@/store/servers';
import { ComfyClient } from '@/utils/comfy-client';
import { saveGeneratedImage } from '@/utils/image-storage';

import { AppBar } from '@/components/layout/app-bar';
import { ServerStatus } from '@/components/pages/run/generation-status-indicator';
import { HistoryDrawer } from '@/components/pages/run/history-drawer';

import ControlPanel from '@/components/pages/run/control-panel';
import { ImagePreview } from '@/components/pages/run/image-preview';
import { Colors } from '@/constants/Colors';
import { useThemeStore } from '@/store/theme';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';

interface GenerationState {
  status: 'idle' | 'generating' | 'downloading';
  progress: { value: number; max: number };
  nodeProgress: { completed: number; total: number };
  downloadProgress: number;
}

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
  const router = useRouter();
  const { theme } = useThemeStore();
  const server = useServersStore((state) =>
    state.servers.find((s) => s.id === serverId),
  );
  const preset = usePresetsStore((state) =>
    state.presets.find((p) => p.id === presetId),
  );

  if (!preset) {
    router.back();
  }

  const [generationState, setGenerationState] = useState<GenerationState>({
    status: 'idle',
    progress: { value: 0, max: 0 },
    nodeProgress: { completed: 0, total: 0 },
    downloadProgress: 0,
  });

  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const comfyClient = useRef<ComfyClient | null>(null);

  const progressCompleteTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const insets = useSafeAreaInsets();

  const snapPoints = useMemo(() => ['40%', '60%', '80%'], []);
  const sheetRef = useRef<BottomSheet>(null);

  const debouncedSetGenerationState = useDebouncedCallback(
    (updates: Partial<GenerationState>) => {
      setGenerationState((prev) => ({
        ...prev,
        ...updates,
      }));
    },
    100,
    { maxWait: 200 },
  );

  const handleProgress = useCallback(
    (value: number, max: number) => {
      debouncedSetGenerationState({
        progress: { value, max },
      });
    },
    [debouncedSetGenerationState],
  );

  const handleNodeProgress = useCallback(
    (completed: number, total: number) => {
      debouncedSetGenerationState({
        nodeProgress: { completed, total },
      });
    },
    [debouncedSetGenerationState],
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

      await comfyClient.current.generate(preset.params, {
        onProgress: handleProgress,
        onNodeStart: () => {},
        onNodeComplete: (node, completed, total) => {
          handleNodeProgress(completed, total);
        },
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
              params: preset.params,
            });

            if (result) {
              const localImageUrl = result.path.startsWith('file://')
                ? result.path
                : `file://${result.path}`;

              setGeneratedImage(localImageUrl);
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
    <View className="z-0 flex-1 bg-background-0">
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
        className="relative z-30 bg-background-0"
      />

      <ImagePreview
        imageUrl={generatedImage || undefined}
        progress={
          generationState.status === 'generating'
            ? {
                current: generationState.progress.value,
                total: generationState.progress.max,
              }
            : undefined
        }
        presetId={preset.id}
        serverId={serverId as string}
      />

      <BottomSheet
        ref={sheetRef}
        index={1}
        snapPoints={snapPoints}
        enableDynamicSizing={false}
        backgroundStyle={{
          backgroundColor:
            theme === 'light'
              ? Colors.light.background[0]
              : Colors.dark.background[0],
        }}
        handleComponent={() => (
          <View className="-mb-1 h-4 items-center justify-center rounded-t-[24px] bg-background-0" />
        )}
      >
        <BottomSheetView
          style={{
            flex: 1,
            height: '100%',
            backgroundColor:
              theme === 'light'
                ? Colors.light.background[0]
                : Colors.dark.background[0],
            paddingBottom: 80,
          }}
        >
          <ControlPanel serverId={serverId as string} presetId={preset.id} />
        </BottomSheetView>
      </BottomSheet>

      <View className="relative z-30 h-20 bg-background-0 px-4">
        <Button
          size="xl"
          variant="solid"
          action="primary"
          onPress={handleGenerate}
          disabled={generationState.status === 'generating'}
          className="rounded-lg active:bg-primary-600 disabled:opacity-50"
        >
          <ButtonIcon as={Wand2} size="sm" />
          <ButtonText className="text-md font-semibold">
            {generationState.status === 'generating'
              ? 'Generating...'
              : 'Generate'}
          </ButtonText>
        </Button>
      </View>

      <HistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        serverId={serverId as string}
        presetId={preset?.id}
        onSelectImage={handleSelectHistoryImage}
      />
    </View>
  );
}
