import { AppBar } from '@/components/layout/app-bar';
import { ConfirmDialog } from '@/components/self-ui/confirm-dialog';
import { Button, ButtonIcon, ButtonText } from '@/components/ui/button';
import { FlatList } from '@/components/ui/flat-list';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { ScrollView } from '@/components/ui/scroll-view';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { VStack } from '@/components/ui/vstack';
import { useServersStore } from '@/features/server/stores/server-store';
import { AddWorkflowModal } from '@/features/workflow/components/add-workflow-modal';
import { ImportWorkflowModal } from '@/features/workflow/components/import-workflow-modal';
import { WorkflowCard } from '@/features/workflow/components/workflow-card';
import { useWorkflowStore } from '@/features/workflow/stores/workflow-store';
import { parseWorkflowTemplate } from '@/features/workflow/utils/workflow-parser';
import { getAndConvertWorkflow as apiGetAndConvertWorkflow, listWorkflows as apiListWorkflows, ServerWorkflowFile } from '@/services/comfy-api';
import { showToast } from '@/utils/toast';
import { Link as ExpoLink, useLocalSearchParams } from 'expo-router';
import { FileSearch, Folder, RefreshCw, Server as ServerIcon, ServerCrash, Trash2, UploadCloud, type LucideIcon } from 'lucide-react-native';
import { MotiView } from 'moti';
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useWindowDimensions } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  FadeIn,
  FadeOut,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TabView as RNETabView } from 'react-native-tab-view';

interface LocalWorkflowsTabProps {
  serverId: string;
  openImportModal: () => void;
}

interface WorkflowEmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  children?: React.ReactNode;
  align?: 'center' | 'top';
}

interface WorkflowTabToggleProps {
  index: number;
  onChange: (index: number) => void;
}

const TOGGLE_CONTAINER_WIDTH = 112;
const TOGGLE_CONTAINER_HEIGHT = 40;
const TOGGLE_HORIZONTAL_PADDING = 4;
const TOGGLE_ITEM_COUNT = 2;
const TOGGLE_THUMB_WIDTH = (TOGGLE_CONTAINER_WIDTH - TOGGLE_HORIZONTAL_PADDING * 2) / TOGGLE_ITEM_COUNT;
const TOGGLE_THUMB_HEIGHT = TOGGLE_CONTAINER_HEIGHT - TOGGLE_HORIZONTAL_PADDING * 2;
const TOGGLE_ANIMATION_STEP = TOGGLE_THUMB_WIDTH;

const WorkflowEmptyState = memo(({ icon, title, description, children, align = 'center' }: WorkflowEmptyStateProps) => {
  const wrapperClassName = align === 'top' ? 'w-full items-center pt-8' : 'flex-1 items-center justify-center';

  return (
    <View className="w-full px-5">
      <View className={wrapperClassName}>
        <MotiView
          from={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'timing', duration: 220 }}
          className="w-full max-w-[360px] items-center"
        >
          <VStack space="md" className="items-center">
            <View className="rounded-full bg-background-50 p-3">
              <Icon as={icon} size="xl" className="h-10 w-10 text-typography-300" />
            </View>

            <VStack space="xs" className="items-center">
              <Text className="text-center text-base font-semibold text-typography-800">{title}</Text>
              <Text className="text-center text-sm text-typography-500">{description}</Text>
            </VStack>

            {children}
          </VStack>
        </MotiView>
      </View>
    </View>
  );
});

const WorkflowTabToggle = memo(({ index, onChange }: WorkflowTabToggleProps) => {
  const togglePosition = useSharedValue(index === 0 ? 0 : 1);

  useEffect(() => {
    togglePosition.value = withTiming(index === 0 ? 0 : 1, {
      duration: 180,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
    });
  }, [index, togglePosition]);

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: togglePosition.value * TOGGLE_ANIMATION_STEP }],
  }));

  return (
    <View
      className="relative rounded-full bg-background-50 p-1"
      style={{ width: TOGGLE_CONTAINER_WIDTH, height: TOGGLE_CONTAINER_HEIGHT }}
    >
      <Animated.View
        className="absolute left-1 top-1 rounded-full bg-primary-500"
        style={[{ width: TOGGLE_THUMB_WIDTH, height: TOGGLE_THUMB_HEIGHT }, thumbStyle]}
      />
      <HStack className="h-8">
        <Pressable
          onPress={() => onChange(0)}
          accessibilityLabel="Switch to local workflows"
          className="h-8 items-center justify-center rounded-full"
          style={{ width: TOGGLE_THUMB_WIDTH }}
        >
          <Icon as={Folder} size="sm" className={index === 0 ? 'text-typography-0' : 'text-typography-500'} />
        </Pressable>
        <Pressable
          onPress={() => onChange(1)}
          accessibilityLabel="Switch to server workflows"
          className="h-8 items-center justify-center rounded-full"
          style={{ width: TOGGLE_THUMB_WIDTH }}
        >
          <Icon as={ServerIcon} size="sm" className={index === 1 ? 'text-typography-0' : 'text-typography-500'} />
        </Pressable>
      </HStack>
    </View>
  );
});

const LocalWorkflowsTab = memo(({ serverId, openImportModal }: LocalWorkflowsTabProps) => {
  const workflows = useWorkflowStore((state) => state.workflow);
  const filteredWorkflows = useMemo(() =>
    workflows.filter((workflow) => workflow.serverId === serverId && workflow.addMethod !== 'server-sync'),
    [workflows, serverId]
  );

  const renderEmptyList = () => (
    <WorkflowEmptyState
      icon={FileSearch}
      title="No Local Workflows"
      description="Import a workflow JSON file to get started."
      align="top"
    />
  );

  return (
    <View className="flex-1">
      <View className="bg-background-0 px-4 pb-2 pt-1">
        <HStack className="items-center justify-between rounded-lg bg-background-50 px-4 py-3">
          <VStack space="xs">
            <Text className="text-sm font-semibold text-typography-900">Local Workflows</Text>
            <Text className="text-xs text-typography-500">{filteredWorkflows.length} items</Text>
          </VStack>
          <Button size="sm" variant="link" onPress={openImportModal}>
            <ButtonIcon as={UploadCloud} />
            <ButtonText>Import Workflow</ButtonText>
          </Button>
        </HStack>
      </View>
      <FlatList
        data={filteredWorkflows}
        renderItem={({ item }) => (
          <View className="w-1/2 p-1.5">
            <WorkflowCard id={item.id} />
          </View>
        )}
        keyExtractor={(item) => item.id}
        numColumns={2}
        ListEmptyComponent={renderEmptyList}
        contentContainerClassName="px-2.5 pb-8 pt-2"
      />
    </View>
  );
});

interface ServerWorkflowsTabProps {
  serverId: string;
  isActiveTab: boolean;
  onRequestClear: () => void;
}

const ServerWorkflowsTab = ({ serverId, isActiveTab, onRequestClear }: ServerWorkflowsTabProps) => {
  const [refreshing, setRefreshing] = useState(false);
  const [serverWorkflows, setServerWorkflows] = useState<ServerWorkflowFile[]>([]);
  const { addWorkflow, updateWorkflow, workflow: storedWorkflows } = useWorkflowStore();
  const workflowsToDisplay = storedWorkflows.filter((wf) => wf.serverId === serverId && wf.addMethod === 'server-sync');
  const cancelSyncRef = useRef(false);
  const hasAutoSyncedRef = useRef(false);
  const syncRunIdRef = useRef(0);
  const refreshingRef = useRef(refreshing);
  const insets = useSafeAreaInsets();

  const [syncProgressText, setSyncProgressText] = useState('');
  const [skippedCount, setSkippedCount] = useState(0);
  const [syncedCount, setSyncedCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const syncIconRotation = useSharedValue(0);

  useEffect(() => {
    if (refreshing) {
      syncIconRotation.value = 0;
      syncIconRotation.value = withRepeat(
        withTiming(360, {
          duration: 800,
          easing: Easing.linear,
        }),
        -1,
        false,
      );
      return;
    }

    cancelAnimation(syncIconRotation);
    syncIconRotation.value = withTiming(0, { duration: 160, easing: Easing.out(Easing.cubic) });
  }, [refreshing, syncIconRotation]);

  const syncIconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${syncIconRotation.value}deg` }],
  }));

  const onRefresh = useCallback(async () => {
    const currentRunId = syncRunIdRef.current + 1;
    syncRunIdRef.current = currentRunId;
    cancelSyncRef.current = false;
    const isCurrentRun = () => syncRunIdRef.current === currentRunId;
    const isActiveRun = () => isCurrentRun() && !cancelSyncRef.current;

    if (!serverId) {
      console.log('Server ID is missing, cannot refresh.');
      if (isCurrentRun()) {
        setRefreshing(false);
      }
      return;
    }
    setRefreshing(true);
    console.log(`Refreshing server workflows for serverId: ${serverId}...`);
    setSyncProgressText('Starting sync...');
    setSkippedCount(0);
    setSyncedCount(0);
    setFailedCount(0);
    let processedCount = 0;
    let localSkippedCount = 0;
    let localSyncedCount = 0;
    let localFailedCount = 0;
    let fetchedFiles: ServerWorkflowFile[] = [];

    try {
      fetchedFiles = await apiListWorkflows(serverId);
      if (!isActiveRun()) {
        return;
      }
      setServerWorkflows(fetchedFiles);
      const totalFiles = fetchedFiles.length;
      if (totalFiles === 0) {
        setSyncProgressText('No files found on server.');
        return;
      }

      for (const serverFile of fetchedFiles) {
        if (!isActiveRun()) {
          console.log('Sync cancelled by user action.');
          break;
        }
        processedCount++;
        setSyncProgressText(`Processing ${processedCount}/${totalFiles}: ${serverFile.filename}`);
        try {
          const latestWorkflows = useWorkflowStore.getState().workflow;
          const identicalWorkflowInStore = latestWorkflows.find(
            (wf) => wf.serverId === serverId &&
              wf.addMethod === 'server-sync' &&
              wf.metadata?.originalFilename === serverFile.filename &&
              wf.metadata?.serverFileModified === serverFile.modified &&
              wf.metadata?.serverFileSize === serverFile.size &&
              wf.metadata?.raw_content === serverFile.raw_content
          );

          const now = new Date().toISOString();
          const newMetadataBase = {
            originalFilename: serverFile.filename,
            lastSyncedAt: now,
            serverFileSize: serverFile.size,
            serverFileModified: serverFile.modified,
            raw_content: serverFile.raw_content,
          };

          if (identicalWorkflowInStore) {
            updateWorkflow(identicalWorkflowInStore.id, {
              metadata: {
                ...identicalWorkflowInStore.metadata,
                lastSyncedAt: now,
              }
            });
            localSkippedCount += 1;
            setSkippedCount(localSkippedCount);
            continue;
          }

          if (!isActiveRun()) { break; }
          setSyncProgressText(`Downloading ${processedCount}/${totalFiles}: ${serverFile.filename}`);
          const rawWorkflowData = await apiGetAndConvertWorkflow(serverId, serverFile.filename);

          if (!isActiveRun()) { break; }
          if (!rawWorkflowData) {
            console.warn(`No data returned from getAndConvertWorkflow for ${serverFile.filename}`);
            localFailedCount += 1;
            setFailedCount(localFailedCount);
            continue;
          }

          if (!isActiveRun()) { break; }
          setSyncProgressText(`Parsing ${processedCount}/${totalFiles}: ${serverFile.filename}`);
          const parsedData = parseWorkflowTemplate(rawWorkflowData);
          const workflowName = serverFile.filename.split('/').pop()?.replace(/\.json$/i, '') || serverFile.filename;

          const latestWorkflowsForPath = useWorkflowStore.getState().workflow;
          const existingWorkflowForPath = latestWorkflowsForPath.find(
            (wf) => wf.serverId === serverId &&
              wf.addMethod === 'server-sync' &&
              wf.metadata?.originalFilename === serverFile.filename
          );

          if (existingWorkflowForPath) {
            updateWorkflow(existingWorkflowForPath.id, {
              name: workflowName,
              data: parsedData,
              metadata: {
                ...existingWorkflowForPath.metadata,
                ...newMetadataBase,
              },
            });
            localSyncedCount += 1;
            setSyncedCount(localSyncedCount);
          } else {
            addWorkflow({
              name: workflowName,
              serverId: serverId,
              data: parsedData,
              addMethod: 'server-sync',
              metadata: newMetadataBase,
              lastUsed: new Date(serverFile.modified * 1000),
            });
            localSyncedCount += 1;
            setSyncedCount(localSyncedCount);
          }
        } catch (convertError) {
          if (!isActiveRun()) {
            break;
          }
          console.warn(`Error processing workflow ${serverFile.filename}:`, convertError);
          localFailedCount += 1;
          setFailedCount(localFailedCount);
        }
      }
      if (!isCurrentRun()) {
        return;
      }
      if (cancelSyncRef.current) {
        setSyncProgressText('Sync cancelled.');
      } else {
        setSyncProgressText(`Sync complete. Synced: ${localSyncedCount}, Skipped: ${localSkippedCount}, Failed: ${localFailedCount}`);
      }
    } catch (error) {
      if (!isCurrentRun()) {
        return;
      }
      if (cancelSyncRef.current) {
        setSyncProgressText('Sync cancelled.');
        return;
      }
      console.warn('Failed to refresh server workflows:', error);
      showToast.error(
        'Sync Error',
        'An error occurred while syncing workflows. Please check your connection and server status.',
        insets.top + 8
      );
      setSyncProgressText('Error listing server workflows.');
      localFailedCount += fetchedFiles?.length || 0;
      setFailedCount(localFailedCount);
    } finally {
      if (isCurrentRun()) {
        setRefreshing(false);
      }
    }
  }, [serverId, addWorkflow, updateWorkflow, insets.top]);

  useEffect(() => {
    refreshingRef.current = refreshing;
    if (!isActiveTab && refreshing) {
      console.log('ServerWorkflowsTab became inactive during sync. Cancelling...');
      cancelSyncRef.current = true;
    }
  }, [isActiveTab, refreshing]);

  useEffect(() => {
    if (!isActiveTab || refreshing || hasAutoSyncedRef.current || workflowsToDisplay.length > 0) {
      return;
    }
    hasAutoSyncedRef.current = true;
    void onRefresh();
  }, [isActiveTab, refreshing, workflowsToDisplay.length, onRefresh]);

  useEffect(() => {
    cancelSyncRef.current = false;
    refreshingRef.current = refreshing;

    return () => {
      if (refreshingRef.current) {
        console.log('ServerWorkflowsTab unmounting. Cancelling any active sync...');
        cancelSyncRef.current = true;
      }
    };
  }, [refreshing]);

  const renderActionRow = () => (
    <View className="bg-background-0 px-4 pb-2 pt-1">
      <Animated.View
        className="rounded-lg bg-background-50 px-4 py-3"
        layout={LinearTransition.duration(180)}
      >
        <HStack className="items-center justify-between">
          <VStack space="xs">
            <Text className="text-sm font-semibold text-typography-900">Server Workflows</Text>
            <Text className="text-xs text-typography-500">Synced {workflowsToDisplay.length} items</Text>
          </VStack>
          <HStack space="sm">
            <Button
              size="sm"
              variant="link"
              disabled={refreshing}
              onPress={onRefresh}
            >
              <Animated.View style={syncIconAnimatedStyle}>
                <ButtonIcon as={RefreshCw} />
              </Animated.View>
              <ButtonText>{refreshing ? 'Syncing' : 'Sync'}</ButtonText>
            </Button>
            <Button
              size="sm"
              variant="link"
              action="negative"
              disabled={refreshing || workflowsToDisplay.length === 0}
              onPress={onRequestClear}
            >
              <ButtonIcon as={Trash2} />
              <ButtonText>Clear</ButtonText>
            </Button>
          </HStack>
        </HStack>
        {refreshing && !!syncProgressText && (
          <Animated.View
            className="pt-1"
            layout={LinearTransition.duration(180)}
            entering={FadeIn.duration(140)}
            exiting={FadeOut.duration(120)}
          >
            <Text className="text-xs text-typography-500">{syncProgressText}</Text>
          </Animated.View>
        )}
      </Animated.View>
    </View>
  );

  const renderMainContent = () => {
    if (workflowsToDisplay.length === 0) {
      return (
        <ScrollView
          className="flex-1"
          contentContainerClassName="items-center px-5 pb-6"
        >
          <WorkflowEmptyState
            icon={ServerCrash}
            title="No Synced Server Workflows"
            description="Tap Sync above to refresh."
            align="top"
          >
            <VStack space="xs" className="w-full rounded-lg bg-background-50 px-4 py-3">
              <Text className="text-center text-xs text-typography-500">
                Make sure <Text className="font-medium text-typography-700">comfy-portal-endpoint</Text> is installed
                and at least one ComfyUI browser tab is connected.
              </Text>
              <ExpoLink href="https://github.com/ShunL12324/comfy-portal-endpoint" className="self-center">
                <Text className="text-xs text-primary-500" style={{ textDecorationLine: 'underline' }}>
                  Installation guide
                </Text>
              </ExpoLink>
            </VStack>
          </WorkflowEmptyState>
        </ScrollView>
      );
    }

    return (
      <FlatList
        data={workflowsToDisplay}
        renderItem={({ item, index }) => (
          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{
              type: 'timing',
              duration: 300,
              delay: index * 50,
            }}
            className="w-1/2 p-1.5"
          >
            <WorkflowCard id={item.id} />
          </MotiView>
        )}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerClassName="px-2.5 pb-8 pt-2"
        className="flex-1"
      />
    );
  };

  return (
    <View className="flex-1 bg-background-0">
      {renderActionRow()}
      {renderMainContent()}
    </View>
  );
};

const WorkflowsScreen = () => {
  const { serverId } = useLocalSearchParams<{ serverId: string }>();
  const server = useServersStore((state) => state.servers.find((s) => s.id === serverId));
  const workflows = useWorkflowStore((state) => state.workflow);
  const { clearServerSyncedWorkflows } = useWorkflowStore();
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isClearAlertOpen, setIsClearAlertOpen] = useState(false);
  const openAddModal = useCallback(() => setIsAddModalOpen(true), []);
  const openImportModal = useCallback(() => setIsImportModalOpen(true), []);

  const layout = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const [routes] = useState([
    { key: 'local', title: 'Local' },
    { key: 'server', title: 'Server' },
  ]);
  const serverTabIndex = routes.findIndex((route) => route.key === 'server');
  const handleRequestClear = useCallback(() => {
    setIsClearAlertOpen(true);
  }, []);

  const handleClearServerWorkflows = useCallback(() => {
    if (serverId) {
      clearServerSyncedWorkflows(serverId);
      console.log(`Cleared server-synced workflows for serverId: ${serverId}`);
    }
  }, [serverId, clearServerSyncedWorkflows]);

  const renderScene = useCallback(({ route }: { route: { key: string } }) => {
    if (!serverId) return null;
    if (route.key === 'local') {
      return <LocalWorkflowsTab serverId={serverId} openImportModal={openImportModal} />;
    }
    if (route.key === 'server') {
      return (
        <ServerWorkflowsTab
          serverId={serverId}
          isActiveTab={index === serverTabIndex}
          onRequestClear={handleRequestClear}
        />
      );
    }
    return null;
  }, [serverId, openImportModal, index, serverTabIndex, handleRequestClear]);

  const serverWorkflowsCount = useMemo(() =>
    serverId
      ? workflows.filter((workflow) => workflow.serverId === serverId && workflow.addMethod === 'server-sync').length
      : 0,
    [workflows, serverId]
  );

  if (!server) {
    return (
      <View className="flex-1 bg-background-0">
        <WorkflowEmptyState
          icon={ServerCrash}
          title="Server Not Found"
          description="This server no longer exists in your server list."
        />
      </View>
    );
  }
  if (!serverId) {
    return (
      <View className="flex-1 bg-background-0">
        <WorkflowEmptyState
          icon={ServerCrash}
          title="Server ID Missing"
          description="The current route does not include a valid server ID."
        />
      </View>
    );
  }

  return (
    <View className={`flex-1 bg-background-0`}>
      <AppBar
        title={server?.name || 'Workflows'}
        showBack
        centerTitle={true}
        rightElement={<WorkflowTabToggle index={index} onChange={setIndex} />}
      />
      <RNETabView
        navigationState={{ index, routes }}
        renderScene={renderScene}
        onIndexChange={setIndex}
        initialLayout={{ width: layout.width }}
        renderTabBar={() => null}
        style={{ flex: 1 }}
        lazy
      />
      <ImportWorkflowModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        serverId={serverId}
      />
      <AddWorkflowModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        serverId={serverId}
      />
      <ConfirmDialog
        isOpen={isClearAlertOpen}
        onClose={() => setIsClearAlertOpen(false)}
        onConfirm={() => {
          handleClearServerWorkflows();
          setIsClearAlertOpen(false);
        }}
        title="Clear Synced Workflows"
        description={`This will remove ${serverWorkflowsCount} synced workflow${serverWorkflowsCount === 1 ? '' : 's'} from ${server.name}. This action cannot be undone.`}
        confirmText="Clear"
        confirmButtonColor="bg-error-500"
      />
    </View>
  );
};

export default WorkflowsScreen;
