import { useLocalSearchParams, useRouter } from 'expo-router';
import { Bot, Images, Search, ServerCrash, Wand2 } from 'lucide-react-native';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';

import { Button, ButtonIcon, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
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
import { AgentChatSheet, AgentChatSheetRef } from '@/features/ai-assistant/components/agent-chat';
import { MediaPreview } from '@/features/generation/components/media-preview';
import { GenerationProvider, useGenerationActions, useGenerationStatus } from '@/features/generation/context/generation-context';
import { useResolvedTheme } from '@/store/theme';
import BottomSheet, { BottomSheetScrollView, BottomSheetTextInput } from '@gorhom/bottom-sheet';

function RunWorkflowScreenContent() {
  const { serverId, workflowId } = useLocalSearchParams();
  const router = useRouter();
  const theme = useResolvedTheme();
  const server = useServersStore((state) => state.servers.find((s) => s.id === serverId));
  const workflowRecord = useWorkflowStore((state) => state.workflow.find((p) => p.id === workflowId));
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const agentChatRef = useRef<AgentChatSheetRef>(null);

  const snapPoints = useMemo(() => ['30%', '60%', '80%'], []);
  const sheetRef = useRef<BottomSheet>(null);

  const { status } = useGenerationStatus();
  const { generate, setGeneratedMedia } = useGenerationActions();

  if (!workflowRecord) {
    router.back();
    return null;
  }

  const handleGenerate = () => {
    if (!server || !workflowRecord) return;
    generate(workflowRecord.data, workflowRecord.id, server.id);
  };

  const handleSelectHistoryMedia = (url: string) => {
    setGeneratedMedia([url]);
    setIsHistoryOpen(false);
  };

  if (!server || !workflowRecord) {
    return (
      <VStack className="flex-1 items-center justify-center px-6" space="md">
        <View className="rounded-full bg-background-50 p-3">
          <Icon as={ServerCrash} size="xl" className="h-10 w-10 text-typography-300" />
        </View>
        <VStack className="items-center" space="xs">
          <Text className="text-center text-base font-semibold text-typography-800">
            {!server ? 'Server Not Found' : 'Workflow Not Found'}
          </Text>
          <Text className="text-center text-sm text-typography-500">
            {!server ? 'Please check your server list and try again.' : 'This workflow may have been removed.'}
          </Text>
        </VStack>
      </VStack>
    );
  }

  const [searchQuery, setSearchQuery] = useState('');

  const nodes = useMemo(() => {
    const allNodes = Object.values(workflowRecord.data);
    const sorted = allNodes.sort((a: any, b: any) => {
      const aId = parseInt(a.id);
      const bId = parseInt(b.id);
      return aId - bId;
    });
    if (!searchQuery) return sorted;
    const lowerQuery = searchQuery.toLowerCase();
    return sorted.filter((node: any) => {
      const title = node._meta?.title || '';
      const type = node.class_type || '';
      const inputs = Object.keys(node.inputs || {}).join(' ');

      return title.toLowerCase().includes(lowerQuery) ||
        type.toLowerCase().includes(lowerQuery) ||
        inputs.toLowerCase().includes(lowerQuery);
    });
  }, [workflowRecord.data, searchQuery]);

  return (
    <View className="z-0 flex-1 bg-background-0">
      <AppBar
        showBack
        title={workflowRecord.name}
        centerElement={
          <RunPageHeaderStatus serverName={server.name} />
        }
        rightElement={
          <HStack className="items-center" space="xs">
            <Button variant="link" className="h-9 w-9 rounded-xl p-0" onPress={() => agentChatRef.current?.present()}>
              <Icon as={Bot} size="md" className="text-primary-500" />
            </Button>
            <Button variant="link" className="h-9 w-9 rounded-xl p-0" onPress={() => setIsHistoryOpen(true)}>
              <Icon as={Images} size="md" className="text-primary-500" />
            </Button>
          </HStack>
        }
        className="relative z-30 bg-background-0"
      />

      <MediaPreview
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
        keyboardBehavior="extend"
        keyboardBlurBehavior="restore"
      >
        <View className="px-4 pt-4 pb-2 bg-background-0">
          <HStack
            className="items-center rounded-lg bg-background-0 px-3 py-3"
            style={{
              borderWidth: 1,
              borderColor: theme === 'light' ? Colors.light.outline[50] : Colors.dark.outline[50],
            }}
          >
            <Icon as={Search} size="sm" className="text-typography-400 mr-2" />
            <BottomSheetTextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search nodes..."
              placeholderTextColor={theme === 'light' ? Colors.light.typography[400] : Colors.dark.typography[400]}
              style={{
                flex: 1,
                color: theme === 'light' ? Colors.light.typography[900] : Colors.dark.typography[900],
                fontSize: 14,
                padding: 0,
              }}
            />
          </HStack>
        </View>
        <BottomSheetScrollView
          contentContainerStyle={{
            padding: 16,
            paddingBottom: 100,
            backgroundColor: theme === 'light' ? Colors.light.background[0] : Colors.dark.background[0],
          }}
          style={{
            flex: 1,
            backgroundColor: theme === 'light' ? Colors.light.background[0] : Colors.dark.background[0],
          }}
        >
          {nodes.map((node: any) => (
            <NodeComponent
              key={node.id}
              node={node}
              serverId={serverId as string}
              workflowId={workflowId as string}
            />
          ))}
        </BottomSheetScrollView>
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
        onSelectMedia={handleSelectHistoryMedia}
      />

      <AgentChatSheet
        ref={agentChatRef}
        workflowId={workflowId as string}
        serverId={serverId as string}
        onRunWorkflow={handleGenerate}
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
