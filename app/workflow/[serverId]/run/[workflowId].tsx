import { useLocalSearchParams, useRouter } from 'expo-router';
import { Images, Search, ServerCrash, Trash2 } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';

import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';

import { useServersStore } from '@/features/server/stores/server-store';
import { useWorkflowStore } from '@/features/workflow/stores/workflow-store';

import { AppBar } from '@/components/layout/app-bar';
import { SheetTabToggle } from '@/components/self-ui/sheet-tab-toggle';
import { HistoryDrawer } from '@/features/generation/components/history-drawer';
import { RunPageHeaderStatus } from '@/features/generation/components/run-page-header-status';
import { GenerateActionButton } from '@/features/generation/components/generate-action-button';

import { Colors } from '@/constants/Colors';
import NodeComponent from '@/features/comfy-node/components/node';
import { AIChatTab, AIChatTabRef } from '@/features/ai-assistant/components/ai-chat-tab';
import { MediaPreview } from '@/features/generation/components/media-preview';
import { AdaptiveScrollView, AdaptiveTextInput } from '@/components/self-ui/adaptive-sheet-components';
import { BottomSheetProvider } from '@/context/bottom-sheet-context';
import { GenerationProvider, useGenerationActions } from '@/features/generation/context/generation-context';
import { useResolvedTheme } from '@/store/theme';
import { useDeviceLayout } from '@/hooks/useDeviceLayout';
import BottomSheet from '@gorhom/bottom-sheet';

import { Button } from '@/components/ui/button';

function NodesTabContent({
  nodes,
  searchQuery,
  setSearchQuery,
  serverId,
  workflowId,
  theme,
  targetNodeId,
  sharedImageUri,
}: {
  nodes: any[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  serverId: string;
  workflowId: string;
  theme: string;
  targetNodeId?: string;
  sharedImageUri?: string;
}) {
  const scrollRef = useRef<any>(null);
  const nodePositions = useRef<Record<string, number>>({});
  const hasScrolled = useRef(false);

  const handleNodeLayout = useCallback((nodeId: string, y: number) => {
    nodePositions.current[nodeId] = y;
  }, []);

  // Scroll to target node after all nodes are laid out and sheet is ready
  useEffect(() => {
    if (!targetNodeId || hasScrolled.current) return;

    const timers: ReturnType<typeof setTimeout>[] = [];

    const scrollToTarget = () => {
      const y = nodePositions.current[targetNodeId];
      if (y !== undefined && scrollRef.current) {
        hasScrolled.current = true;
        scrollRef.current.scrollTo({ y, animated: true });
        // Retry a few times to handle BottomSheet layout settling
        for (const delay of [1000, 2000, 3000]) {
          timers.push(setTimeout(() => scrollRef.current?.scrollTo({ y, animated: true }), delay));
        }
      }
    };

    timers.push(setTimeout(scrollToTarget, 2000));

    return () => timers.forEach(clearTimeout);
  }, [targetNodeId, nodes]);

  return (
    <View className="flex-1 bg-background-0">
      <View className="px-4 pt-4 pb-2 bg-background-0">
        <HStack
          className="items-center rounded-lg bg-background-0 px-3 py-3"
          style={{
            borderWidth: 1,
            borderColor: theme === 'light' ? Colors.light.outline[50] : Colors.dark.outline[50],
          }}
        >
          <Icon as={Search} size="sm" className="text-typography-400 mr-2" />
          <AdaptiveTextInput
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
      <AdaptiveScrollView
        ref={scrollRef}
        contentContainerStyle={{
          padding: 16,
          paddingBottom: 24,
          backgroundColor: theme === 'light' ? Colors.light.background[0] : Colors.dark.background[0],
        }}
        style={{
          flex: 1,
          backgroundColor: theme === 'light' ? Colors.light.background[0] : Colors.dark.background[0],
        }}
      >
        {nodes.map((node: any) => (
          <View
            key={node.id}
            onLayout={(e) => handleNodeLayout(node.id, e.nativeEvent.layout.y)}
          >
            <NodeComponent
              node={node}
              serverId={serverId}
              workflowId={workflowId}
              sharedImageUri={targetNodeId === node.id ? sharedImageUri : undefined}
            />
          </View>
        ))}
      </AdaptiveScrollView>
    </View>
  );
}

function RunWorkflowScreenContent() {
  const { serverId, workflowId, sharedImageUri, targetNodeId } = useLocalSearchParams<{
    serverId: string;
    workflowId: string;
    sharedImageUri?: string;
    targetNodeId?: string;
  }>();
  const router = useRouter();
  const theme = useResolvedTheme();
  const server = useServersStore((state) => state.servers.find((s) => s.id === serverId));
  const workflowRecord = useWorkflowStore((state) => state.workflow.find((p) => p.id === workflowId));
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const snapPoints = useMemo(() => ['30%', '60%', '80%'], []);
  const sheetRef = useRef<BottomSheet>(null);
  const aiChatTabRef = useRef<AIChatTabRef>(null);
  const sheetSnapIndexRef = useRef(1);

  // Tab state — simple index, no longer driven by react-native-tab-view
  const [tabIndex, setTabIndex] = useState(0);

  const { generate, setGeneratedMedia } = useGenerationActions();

  const [searchQuery, setSearchQuery] = useState('');
  const { layout, isLandscape } = useDeviceLayout();
  const useSplitLayout = layout !== 'compact' && isLandscape;

  const handleGenerate = useCallback(() => {
    if (!server || !workflowRecord) return;
    generate(workflowRecord.data, workflowRecord.id, server.id);
  }, [server, workflowRecord, generate]);

  const handleSelectHistoryMedia = useCallback((url: string) => {
    setGeneratedMedia([url]);
    setIsHistoryOpen(false);
  }, [setGeneratedMedia]);

  const handleTabChange = useCallback((newIndex: number) => {
    setTabIndex(newIndex);
    // Auto-expand sheet when switching to AI tab at minimum snap
    if (newIndex === 1 && sheetSnapIndexRef.current === 0) {
      sheetRef.current?.snapToIndex(1);
    }
  }, []);

  const handleSheetChange = useCallback((index: number) => {
    sheetSnapIndexRef.current = index;
  }, []);

  const nodes = useMemo(() => {
    if (!workflowRecord) return [];
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
  }, [workflowRecord, searchQuery]);

  // Early returns after all hooks
  if (!workflowRecord) {
    router.back();
    return null;
  }

  if (!server) {
    return (
      <VStack className="flex-1 items-center justify-center px-6" space="md">
        <View className="rounded-full bg-background-50 p-3">
          <Icon as={ServerCrash} size="xl" className="h-10 w-10 text-typography-300" />
        </View>
        <VStack className="items-center" space="xs">
          <Text className="text-center text-base font-semibold text-typography-800">
            Server Not Found
          </Text>
          <Text className="text-center text-sm text-typography-500">
            Please check your server list and try again.
          </Text>
        </VStack>
      </VStack>
    );
  }

  return (
    <View className="z-0 flex-1 bg-background-0">
      <AppBar
        showBack
        title={workflowRecord.name}
        showBottomBorder={useSplitLayout}
        centerElement={
          <RunPageHeaderStatus serverName={server.name} />
        }
        rightElement={
          <HStack className="items-center" space="xs">
            <Button variant="link" className="h-9 w-9 rounded-xl p-0" onPress={() => setIsHistoryOpen(true)}>
              <Icon as={Images} size="md" className="text-primary-500" />
            </Button>
          </HStack>
        }
        className="relative z-30 bg-background-0"
      />

      {useSplitLayout ? (
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <View style={{ flex: 1 }}>
            <MediaPreview workflowId={workflowRecord.id} serverId={serverId as string} />
          </View>
          <View
            style={{
              width: 400,
              borderLeftWidth: 1,
              borderLeftColor: theme === 'light' ? Colors.light.outline[50] : Colors.dark.outline[50],
            }}
          >
            {/* Panel Header */}
            <View className="flex-row items-center justify-between px-4 py-3 bg-background-0">
              <SheetTabToggle index={tabIndex} onChange={handleTabChange} />
              <HStack className="items-center" space="xs">
                {tabIndex === 1 && (
                  <Pressable
                    onPress={() => aiChatTabRef.current?.clearChat()}
                    className="rounded-lg p-2 active:bg-background-100"
                  >
                    <Icon as={Trash2} size="sm" className="text-typography-400" />
                  </Pressable>
                )}
                <GenerateActionButton onGenerate={handleGenerate} />
              </HStack>
            </View>
            {/* Panel Content */}
            <BottomSheetProvider isInSheet={false}>
              <View style={{ flex: 1 }}>
                {tabIndex === 0 ? (
                    <NodesTabContent
                      nodes={nodes}
                      searchQuery={searchQuery}
                      setSearchQuery={setSearchQuery}
                      serverId={serverId as string}
                      workflowId={workflowId as string}
                      theme={theme}
                      targetNodeId={targetNodeId}
                      sharedImageUri={sharedImageUri}
                    />
                ) : (
                  <AIChatTab
                    ref={aiChatTabRef}
                    workflowId={workflowId as string}
                    serverId={serverId as string}
                    onRunWorkflow={handleGenerate}
                  />
                )}
              </View>
            </BottomSheetProvider>
          </View>
        </View>
      ) : (
        <>
          <MediaPreview workflowId={workflowRecord.id} serverId={serverId as string} />

          <BottomSheet
            ref={sheetRef}
            index={sharedImageUri ? 2 : 1}
            snapPoints={snapPoints}
            enableDynamicSizing={false}
            onChange={handleSheetChange}
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
            {/* Sheet Header: toggle + contextual actions + generate button */}
            <View className="flex-row items-center justify-between px-4 pb-2 bg-background-0">
              <SheetTabToggle index={tabIndex} onChange={handleTabChange} />
              <HStack className="items-center" space="xs">
                {tabIndex === 1 && (
                  <Pressable
                    onPress={() => aiChatTabRef.current?.clearChat()}
                    className="rounded-lg p-2 active:bg-background-100"
                  >
                    <Icon as={Trash2} size="sm" className="text-typography-400" />
                  </Pressable>
                )}
                <GenerateActionButton onGenerate={handleGenerate} />
              </HStack>
            </View>

            {tabIndex === 0 ? (
              <NodesTabContent
                nodes={nodes}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                serverId={serverId as string}
                workflowId={workflowId as string}
                theme={theme}
                targetNodeId={targetNodeId}
                sharedImageUri={sharedImageUri}
              />
            ) : (
              <AIChatTab
                ref={aiChatTabRef}
                workflowId={workflowId as string}
                serverId={serverId as string}
                onRunWorkflow={handleGenerate}
              />
            )}
          </BottomSheet>
        </>
      )}

      <HistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        serverId={serverId as string}
        workflowId={workflowRecord?.id}
        onSelectMedia={handleSelectHistoryMedia}
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
