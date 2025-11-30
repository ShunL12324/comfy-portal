import { useLocalSearchParams, useRouter } from 'expo-router';
import { Images, Wand2 } from 'lucide-react-native';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';

import { Button, ButtonIcon, ButtonText } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';

import { useServersStore } from '@/features/server/stores/server-store';
import { useWorkflowStore } from '@/features/workflow/stores/workflow-store';

import { AppBar } from '@/components/layout/app-bar';
import { HistoryDrawer } from '@/features/generation/components/history-drawer';
import { RunPageHeaderStatus } from '@/features/generation/components/run-page-header-status';

import { Colors } from '@/constants/Colors';
import NodeComponent from '@/features/comfy-node/components/node';
import { ImagePreview } from '@/features/generation/components/image-preview';
import { GenerationProvider, useGenerationActions, useGenerationStatus } from '@/features/generation/context/generation-context';
import { useThemeStore } from '@/store/theme';
import BottomSheet, { BottomSheetFlatList } from '@gorhom/bottom-sheet';

function RunWorkflowScreenContent() {
  const { serverId, workflowId } = useLocalSearchParams();
  const router = useRouter();
  const { theme } = useThemeStore();
  const server = useServersStore((state) => state.servers.find((s) => s.id === serverId));
  const workflowRecord = useWorkflowStore((state) => state.workflow.find((p) => p.id === workflowId));
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const snapPoints = useMemo(() => ['30%', '60%', '80%'], []);
  const sheetRef = useRef<BottomSheet>(null);

  const { status, generatedImage } = useGenerationStatus();
  const { generate, setGeneratedImage } = useGenerationActions();

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

  const nodes = useMemo(() => Object.values(workflowRecord.data), [workflowRecord.data]);

  const renderItem = useCallback(
    ({ item }: { item: any }) => (
      <NodeComponent node={item} serverId={serverId as string} workflowId={workflowId as string} />
    ),
    [serverId, workflowId],
  );

  return (
    <View className="z-0 flex-1 bg-background-0">
      <AppBar
        showBack
        title={workflowRecord.name}
        centerElement={
          <RunPageHeaderStatus serverName={server.name} />
        }
        rightElement={
          <Button variant="link" className="h-9 w-9 rounded-xl p-0" onPress={() => setIsHistoryOpen(true)}>
            <Icon as={Images} size="md" className="text-primary-500" />
          </Button>
        }
        className="relative z-30 bg-background-0"
      />

      <ImagePreview
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
        <BottomSheetFlatList
          data={nodes}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{
            padding: 16,
            paddingBottom: 100, // Extra padding for bottom button
            backgroundColor: theme === 'light' ? Colors.light.background[0] : Colors.dark.background[0],
          }}
          style={{
            flex: 1,
            height: '100%',
            backgroundColor: theme === 'light' ? Colors.light.background[0] : Colors.dark.background[0],
          }}
        />
      </BottomSheet>

      <View className="relative z-30 h-20 bg-background-0 px-4">
        <Button
          size="xl"
          variant="solid"
          action="primary"
          onPress={handleGenerate}
          disabled={status === 'generating'}
          className="rounded-lg active:bg-primary-600 disabled:opacity-50"
        >
          <ButtonIcon as={Wand2} size="sm" />
          <ButtonText className="text-md font-semibold">
            {status === 'generating' ? 'Generating...' : 'Generate'}
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
