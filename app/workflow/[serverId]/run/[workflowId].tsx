import { useLocalSearchParams, useRouter } from 'expo-router';
import { Images, Wand2 } from 'lucide-react-native';
import React, { useMemo, useRef, useState } from 'react';
import { View } from 'react-native';

import { Button, ButtonIcon, ButtonText } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';

import { useServersStore } from '@/store/servers';
import { useWorkflowStore } from '@/store/workflow';

import { AppBar } from '@/components/layout/app-bar';
import { ServerStatus } from '@/components/pages/run/generation-status-indicator';
import { HistoryDrawer } from '@/components/pages/run/history-drawer';

import NodeComponent from '@/components/comfyui/node';
import { ImagePreview } from '@/components/pages/run/image-preview';
import { Colors } from '@/constants/Colors';
import { GenerationProvider, useGeneration } from '@/context/generation-context';
import { useThemeStore } from '@/store/theme';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';

function RunWorkflowScreenContent() {
  const { serverId, workflowId } = useLocalSearchParams();
  const router = useRouter();
  const { theme } = useThemeStore();
  const server = useServersStore((state) => state.servers.find((s) => s.id === serverId));
  const workflowRecord = useWorkflowStore((state) => state.workflow.find((p) => p.id === workflowId));
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const snapPoints = useMemo(() => ['30%', '60%', '80%'], []);
  const sheetRef = useRef<BottomSheet>(null);

  const { state, generatedImage, generate, setGeneratedImage } = useGeneration();

  if (!workflowRecord) {
    router.back();
    return null;
  }

  const handleGenerate = () => {
    if (!server || !workflowRecord) return;
    generate(workflowRecord.data, workflowRecord.id, server.id);
  };

  const handleSelectHistoryImage = (url: string) => {
    setGeneratedImage(url);
    setIsHistoryOpen(false);
  };

  if (!server || !workflowRecord) {
    return (
      <VStack className="flex-1 items-center justify-center">
        <Text className="text-primary-300">{!server ? 'Server' : 'Workflow'} not found</Text>
      </VStack>
    );
  }

  return (
    <View className="z-0 flex-1 bg-background-0">
      <AppBar
        showBack
        title={workflowRecord.name}
        centerElement={
          <ServerStatus
            generating={state.status === 'generating'}
            downloading={state.status === 'downloading'}
            downloadProgress={state.downloadProgress}
            generationProgress={state.progress}
            name={server.name}
          />
        }
        rightElement={
          <Button variant="link" className="h-9 w-9 rounded-xl p-0" onPress={() => setIsHistoryOpen(true)}>
            <Icon as={Images} size="md" className="text-primary-500" />
          </Button>
        }
        className="relative z-30 bg-background-0"
      />

      <ImagePreview
        imageUrl={generatedImage || undefined}
        progress={
          state.status === 'generating'
            ? {
                current: state.progress.value,
                total: state.progress.max,
              }
            : undefined
        }
        workflowId={workflowRecord.id}
        serverId={serverId as string}
      />

      <BottomSheet
        ref={sheetRef}
        index={1}
        snapPoints={snapPoints}
        enableDynamicSizing={false}
        backgroundStyle={{
          backgroundColor: theme === 'light' ? Colors.light.background[0] : Colors.dark.background[0],
          borderWidth: 1,
          borderColor: theme === 'light' ? Colors.light.outline[50] : Colors.dark.outline[50],
        }}
        handleIndicatorStyle={{
          backgroundColor: theme === 'light' ? Colors.light.background[300] : Colors.dark.background[300],
          width: 48,
        }}
        handleStyle={{
          height: 32,
        }}
      >
        <BottomSheetScrollView
          style={{
            flex: 1,
            height: '100%',
            backgroundColor: theme === 'light' ? Colors.light.background[0] : Colors.dark.background[0],
            padding: 16,
          }}
          automaticallyAdjustKeyboardInsets
        >
          {Object.entries(workflowRecord.data).map(([nodeId, node]) => (
            <NodeComponent key={nodeId} node={node} serverId={serverId as string} workflowId={workflowId as string} />
          ))}
          {/* placeholder */}
          <View className="h-24" />
        </BottomSheetScrollView>
      </BottomSheet>

      <View className="relative z-30 h-20 bg-background-0 px-4">
        <Button
          size="xl"
          variant="solid"
          action="primary"
          onPress={handleGenerate}
          disabled={state.status === 'generating'}
          className="rounded-lg active:bg-primary-600 disabled:opacity-50"
        >
          <ButtonIcon as={Wand2} size="sm" />
          <ButtonText className="text-md font-semibold">
            {state.status === 'generating' ? 'Generating...' : 'Generate'}
          </ButtonText>
        </Button>
      </View>

      <HistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        serverId={serverId as string}
        workflowId={workflowRecord?.id}
        onSelectImage={handleSelectHistoryImage}
      />
    </View>
  );
}

export default function RunWorkflowScreen() {
  return (
    <GenerationProvider>
      <RunWorkflowScreenContent />
    </GenerationProvider>
  );
}
