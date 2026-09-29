import { PersistentSheet } from '@/components/ui/design-system/overlays';
import { NativeIconSegments } from '@/components/ui/design-system/native-controls';
import { Action, Copy, Field, StateIcon, useDesign } from '@/components/ui/design-system/primitives';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Bot, Images, ServerCrash, Sliders, Trash2 } from '@/constants/icons';
import { createContext, useContext, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { View } from 'react-native';

import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';

import { useServersStore } from '@/features/server/stores/server-store';
import { useWorkflowStore } from '@/features/workflow/stores/workflow-store';

import { AppBar } from '@/components/layout/app-bar';
import { GenerateActionButton } from '@/features/generation/components/generate-action-button';
import { RunPageHeaderStatus } from '@/features/generation/components/run-page-header-status';

import { AdaptiveKeyboardAwareScrollView } from '@/components/self-ui/adaptive-sheet-components';
import { designTokens as t } from '@/constants/design-tokens';
import { BottomSheetProvider } from '@/context/bottom-sheet-context';
import { AIChatTab, AIChatTabRef } from '@/features/ai-assistant/components/ai-chat-tab';
import NodeComponent from '@/features/comfy-node/components/node';
import { MediaPreview } from '@/features/generation/components/media-preview';
import { GenerationProvider, useGenerationActions } from '@/features/generation/context/generation-context';
import { useDeviceLayout } from '@/hooks/use-device-layout';
import type BottomSheet from '@gorhom/bottom-sheet';
import { BottomSheetFooter, useBottomSheetInternal, type BottomSheetFooterProps } from '@gorhom/bottom-sheet';

const ChatComposerContext = createContext<ReactNode>(null);

function ChatSheetFooter(props: BottomSheetFooterProps) {
  const composer = useContext(ChatComposerContext);
  const { animatedLayoutState } = useBottomSheetInternal();
  useEffect(
    () => () => {
      animatedLayoutState.modify((state) => {
        'worklet';
        state.footerHeight = 0;
        return state;
      });
    },
    [animatedLayoutState],
  );
  return <BottomSheetFooter {...props}>{composer}</BottomSheetFooter>;
}

// Both the sheet and the split-layout panel render the same tab control.
const RUN_TABS = [
  { label: 'Nodes', icon: Sliders },
  { label: 'Assistant', icon: Bot },
];

function NodesTabContent({
  nodes,
  searchQuery,
  setSearchQuery,
  serverId,
  workflowId,
  targetNodeId,
  sharedImageUri,
}: {
  nodes: any[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  serverId: string;
  workflowId: string;
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

  const bgColor = useDesign().workspace;

  const nodeList = nodes.map((node: any) => (
    <View key={node.id} onLayout={(e) => handleNodeLayout(node.id, e.nativeEvent.layout.y)}>
      <NodeComponent
        node={node}
        serverId={serverId}
        workflowId={workflowId}
        sharedImageUri={targetNodeId === node.id ? sharedImageUri : undefined}
      />
    </View>
  ));

  const scrollContentStyle = {
    paddingHorizontal: t.layout.inset,
    paddingTop: t.layout.related,
    paddingBottom: t.layout.section,
    backgroundColor: bgColor,
  };
  const scrollStyle = { flex: 1 as const, backgroundColor: bgColor };

  return (
    <View testID="run-node-panel" className="bg-surface-workspace flex-1">
      <View className="px-4 pt-4 pb-2 bg-surface-workspace">
        <View testID="run-node-search">
          <Field
            search
            surface="workspace-card"
            label="Search nodes"
            placeholder="Search nodes..."
            value={searchQuery}
            onChange={setSearchQuery}
          />
        </View>
      </View>
      <AdaptiveKeyboardAwareScrollView
        testID="run-node-list"
        ref={scrollRef}
        bottomOffset={20}
        contentContainerStyle={scrollContentStyle}
        style={scrollStyle}
      >
        {nodeList}
      </AdaptiveKeyboardAwareScrollView>
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
  const c = useDesign();
  const server = useServersStore((state) => state.servers.find((s) => s.id === serverId));
  const ensureModelsFresh = useServersStore((state) => state.ensureModelsFresh);
  const workflowRecord = useWorkflowStore((state) => state.workflow.find((p) => p.id === workflowId));

  // This page is where the model catalogue is actually consumed, and it's the
  // moment right after the user downloads something onto their server. Until
  // now the only thing that ever refreshed models was pull-to-refresh on the
  // Servers tab, so a freshly downloaded model showed up as "not selected" in
  // every picker that referenced it.
  useEffect(() => {
    if (!serverId) return;
    void ensureModelsFresh(serverId);
  }, [serverId, ensureModelsFresh]);

  const snapPoints = useMemo(() => ['30%', '60%', '80%'], []);
  const sheetRef = useRef<BottomSheet>(null);
  const aiChatTabRef = useRef<AIChatTabRef>(null);
  const sheetSnapIndexRef = useRef(1);

  // Tab state — simple index, no longer driven by react-native-tab-view
  const [tabIndex, setTabIndex] = useState(0);
  const [chatState, setChatState] = useState({ hasMessages: false, isBusy: false });
  const [chatComposer, setChatComposer] = useState<ReactNode>(null);

  const { generate } = useGenerationActions();

  const [searchQuery, setSearchQuery] = useState('');
  const { layout, isLandscape, width: screenWidth } = useDeviceLayout();
  const useSplitLayout = layout !== 'compact' && isLandscape;
  const panelWidth = useSplitLayout ? Math.min(480, Math.max(360, screenWidth * 0.35)) : 0;

  const handleGenerate = useCallback(() => {
    if (!server || !workflowRecord) return;
    generate(workflowRecord.data, workflowRecord.id, server.id);
  }, [server, workflowRecord, generate]);

  const openHistoryGallery = useCallback(() => {
    router.push({
      pathname: '/workflow/[serverId]/run/history',
      params: { serverId: serverId as string, workflowId: workflowId as string },
    });
  }, [router, serverId, workflowId]);

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

      return (
        title.toLowerCase().includes(lowerQuery) ||
        type.toLowerCase().includes(lowerQuery) ||
        inputs.toLowerCase().includes(lowerQuery)
      );
    });
  }, [workflowRecord, searchQuery]);

  // Early returns after all hooks
  if (!workflowRecord) {
    return (
      <View className="bg-surface-base flex-1">
        <AppBar title="Workflow unavailable" showBack />
        <Copy className="px-5" style={{ color: c.secondary }}>
          This workflow may have been removed. Return to the workspace to choose another.
        </Copy>
      </View>
    );
  }

  if (!server) {
    return (
      <VStack className="px-6 flex-1 items-center justify-center" space="md">
        <StateIcon icon={ServerCrash} size={t.icon.hero} />
        <VStack className="items-center" space="xs">
          <Copy size="section" style={{ fontWeight: '600', textAlign: 'center' }}>
            Server Not Found
          </Copy>
          <Copy style={{ color: c.secondary, textAlign: 'center' }}>Please check your server list and try again.</Copy>
        </VStack>
      </VStack>
    );
  }

  return (
    <View className="bg-surface-base z-0 flex-1">
      <AppBar
        showBack
        title={workflowRecord.name}
        showBottomBorder={useSplitLayout}
        titleSize="sm"
        bottomElement={<RunPageHeaderStatus workflowId={workflowRecord.id} />}
        rightElement={
          <HStack className="items-center" space="xs">
            <Action kind="text" icon={Images} label="Open results gallery" onPress={openHistoryGallery} />
          </HStack>
        }
        className="bg-surface-base relative z-30"
      />

      {useSplitLayout ? (
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <View style={{ flex: 1 }}>
            <MediaPreview workflowId={workflowRecord.id} serverId={serverId as string} />
          </View>
          <View
            style={{
              width: panelWidth,
              backgroundColor: c.workspace,
            }}
          >
            {/* Panel Header */}
            <View className="px-4 py-3 bg-surface-workspace flex-row items-center justify-between">
              <NativeIconSegments items={RUN_TABS} index={tabIndex} onChange={handleTabChange} label="Run panel" />
              <HStack className="items-center" space="xs">
                {tabIndex === 1 && chatState.hasMessages && (
                  <Action
                    kind="text"
                    small
                    icon={Trash2}
                    label="Clear conversation"
                    disabled={chatState.isBusy}
                    onPress={() => aiChatTabRef.current?.clearChat()}
                  />
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
                    targetNodeId={targetNodeId}
                    sharedImageUri={sharedImageUri}
                  />
                ) : (
                  <AIChatTab
                    ref={aiChatTabRef}
                    workflowId={workflowId as string}
                    serverId={serverId as string}
                    onRunWorkflow={handleGenerate}
                    onConversationStateChange={setChatState}
                  />
                )}
              </View>
            </BottomSheetProvider>
          </View>
        </View>
      ) : (
        <>
          <MediaPreview workflowId={workflowRecord.id} serverId={serverId as string} />

          <ChatComposerContext.Provider value={chatComposer}>
            <PersistentSheet
              ref={sheetRef}
              index={sharedImageUri ? 2 : 1}
              snapPoints={snapPoints}
              enableDynamicSizing={false}
              // Content scrolls at every detent; only the handle resizes the sheet.
              enableContentPanningGesture={false}
              enableHandlePanningGesture
              onChange={handleSheetChange}
              keyboardBehavior="extend"
              keyboardBlurBehavior="restore"
              footerComponent={tabIndex === 1 ? ChatSheetFooter : undefined}
            >
              {/* Sheet Header: toggle + contextual actions + generate button */}
              <View className="px-4 pb-2 bg-surface-workspace flex-row items-center justify-between">
                <NativeIconSegments items={RUN_TABS} index={tabIndex} onChange={handleTabChange} label="Run panel" />
                <HStack className="items-center" space="xs">
                  {tabIndex === 1 && chatState.hasMessages && (
                    <Action
                      kind="text"
                      small
                      icon={Trash2}
                      label="Clear conversation"
                      disabled={chatState.isBusy}
                      onPress={() => aiChatTabRef.current?.clearChat()}
                    />
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
                  targetNodeId={targetNodeId}
                  sharedImageUri={sharedImageUri}
                />
              ) : (
                <AIChatTab
                  ref={aiChatTabRef}
                  workflowId={workflowId as string}
                  serverId={serverId as string}
                  onRunWorkflow={handleGenerate}
                  onConversationStateChange={setChatState}
                  onComposerChange={setChatComposer}
                />
              )}
            </PersistentSheet>
          </ChatComposerContext.Provider>
        </>
      )}
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
