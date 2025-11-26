import { AppBar } from '@/components/layout/app-bar';
import { AddWorkflowModal } from '@/components/pages/workflow/add-workflow-modal';
import { ImportWorkflowModal } from '@/components/pages/workflow/import-workflow-modal';
import { WorkflowCard } from '@/components/pages/workflow/workflow-card';
import { ConfirmDialog } from '@/components/self-ui/confirm-dialog';
import { Center } from '@/components/ui/center';
import { Fab, FabIcon, FabLabel } from '@/components/ui/fab';
import { FlatList } from '@/components/ui/flat-list';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { RefreshControl } from '@/components/ui/refresh-control';
import { ScrollView } from '@/components/ui/scroll-view';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { VStack } from '@/components/ui/vstack';
import { useServersStore } from '@/store/servers';
import { useWorkflowStore } from '@/store/workflow';
import { getAndConvertWorkflow as apiGetAndConvertWorkflow, listWorkflows as apiListWorkflows, ServerWorkflowFile } from '@/utils/comfy-api-tools';
import { showToast } from '@/utils/toast';
import { parseWorkflowTemplate } from '@/utils/workflow-parser';
import { Link as ExpoLink, useLocalSearchParams } from 'expo-router';
import { FileSearch, ServerCrash, UploadCloud } from 'lucide-react-native';
import { MotiView } from 'moti';
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useColorScheme, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TabView as RNETabView, SceneMap } from 'react-native-tab-view';

interface LocalWorkflowsTabProps {
  serverId: string;
  openImportModal: () => void;
}

const LocalWorkflowsTab = memo(({ serverId, openImportModal }: LocalWorkflowsTabProps) => {
  const workflows = useWorkflowStore((state) => state.workflow);
  const filteredWorkflows = useMemo(() =>
    workflows.filter((workflow) => workflow.serverId === serverId && workflow.addMethod !== 'server-sync'),
    [workflows, serverId]
  );

  const renderEmptyList = () => (
    <Center className="mt-10 flex-1 px-5">
      <MotiView
        from={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'timing', duration: 300 }}
      >
        <VStack space="lg" className="items-center px-6">
          <Icon as={FileSearch} size="xl" className="mb-2 h-16 w-16 text-typography-200" />
          <VStack space="xs" className="items-center">
            <Text className="text-center text-sm text-typography-500">
              No local workflows found for this server.
            </Text>
          </VStack>
        </VStack>
      </MotiView>
    </Center>
  );

  return (
    <View className="flex-1">
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
        contentContainerClassName="px-2.5 pb-20 pt-3"
      />
      <Fab
        size="md"
        placement="bottom center"
        className="bg-primary-500"
        onPress={openImportModal}
      >
        <FabIcon as={UploadCloud} className="mr-2" />
        <FabLabel>Import Workflow</FabLabel>
      </Fab>
    </View>
  );
});

interface ServerWorkflowsTabProps {
  serverId: string;
  isActiveTab: boolean;
}

const ServerWorkflowsTab = ({ serverId, isActiveTab }: ServerWorkflowsTabProps) => {
  const [refreshing, setRefreshing] = useState(false);
  const [serverWorkflows, setServerWorkflows] = useState<ServerWorkflowFile[]>([]);
  const { addWorkflow, updateWorkflow, workflow: storedWorkflows, clearServerSyncedWorkflows } = useWorkflowStore();
  const cancelSyncRef = useRef(false);
  const refreshingRef = useRef(refreshing);
  const insets = useSafeAreaInsets();

  const [syncProgressText, setSyncProgressText] = useState('');
  const [skippedCount, setSkippedCount] = useState(0);
  const [syncedCount, setSyncedCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);

  const colorScheme = useColorScheme();
  const refreshControlColor = colorScheme === 'dark' ? '#E0E0E0' : '#333333';
  const progressBgColor = colorScheme === 'dark' ? '#262626' : '#FAFAFA';

  const onRefresh = useCallback(async () => {
    cancelSyncRef.current = false;
    if (!serverId) {
      console.log('Server ID is missing, cannot refresh.');
      setRefreshing(false);
      return;
    }
    setRefreshing(true);
    console.log(`Refreshing server workflows for serverId: ${serverId}...`);
    setSyncProgressText('Starting sync...');
    setSkippedCount(0);
    setSyncedCount(0);
    setFailedCount(0);
    let processedCount = 0;
    let fetchedFiles: ServerWorkflowFile[] = [];

    try {
      fetchedFiles = await apiListWorkflows(serverId);
      setServerWorkflows(fetchedFiles);
      const totalFiles = fetchedFiles.length;
      if (totalFiles === 0) {
        setSyncProgressText('No files found on server.');
        setRefreshing(false);
        return;
      }

      for (const serverFile of fetchedFiles) {
        if (cancelSyncRef.current) {
          console.log('Sync cancelled by user action.');
          setSyncProgressText('Sync cancelled.');
          break;
        }
        processedCount++;
        setSyncProgressText(`Processing ${processedCount}/${totalFiles}: ${serverFile.filename}`);
        try {
          const identicalWorkflowInStore = storedWorkflows.find(
            (wf) => wf.serverId === serverId &&
              wf.addMethod === 'server-sync' &&
              wf.metadata?.originalFilename === serverFile.filename &&
              wf.metadata?.serverFileModified === serverFile.modified &&
              wf.metadata?.serverFileSize === serverFile.size &&
              wf.metadata?.raw_content === serverFile.raw_content
          );

          const newMetadataBase = {
            originalFilename: serverFile.filename,
            lastSyncedAt: new Date().toISOString(),
            serverFileSize: serverFile.size,
            serverFileModified: serverFile.modified,
            raw_content: serverFile.raw_content,
          };

          if (identicalWorkflowInStore) {
            updateWorkflow(identicalWorkflowInStore.id, {
              metadata: {
                ...identicalWorkflowInStore.metadata,
                lastSyncedAt: new Date().toISOString(),
              }
            });
            setSkippedCount(prev => prev + 1);
            continue;
          }

          if (cancelSyncRef.current) { break; }
          setSyncProgressText(`Downloading ${processedCount}/${totalFiles}: ${serverFile.filename}`);
          const rawWorkflowData = await apiGetAndConvertWorkflow(serverId, serverFile.filename);

          if (cancelSyncRef.current) { break; }
          if (!rawWorkflowData) {
            console.warn(`No data returned from getAndConvertWorkflow for ${serverFile.filename}`);
            setFailedCount(prev => prev + 1);
            continue;
          }

          if (cancelSyncRef.current) { break; }
          setSyncProgressText(`Parsing ${processedCount}/${totalFiles}: ${serverFile.filename}`);
          const parsedData = parseWorkflowTemplate(rawWorkflowData);
          const workflowName = serverFile.filename.split('/').pop()?.replace(/\.json$/i, '') || serverFile.filename;

          const existingWorkflowForPath = storedWorkflows.find(
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
            setSyncedCount(prev => prev + 1);
          } else {
            addWorkflow({
              name: workflowName,
              serverId: serverId,
              data: parsedData,
              addMethod: 'server-sync',
              metadata: newMetadataBase,
              lastUsed: new Date(serverFile.modified * 1000),
            });
            setSyncedCount(prev => prev + 1);
          }
        } catch (convertError) {
          console.warn(`Error processing workflow ${serverFile.filename}:`, convertError);
          setFailedCount(prev => prev + 1);
        }
      }
      setSyncProgressText(`Sync complete. Synced: ${syncedCount}, Skipped: ${skippedCount}, Failed: ${failedCount}`);
    } catch (error) {
      console.warn('Failed to refresh server workflows:', error);
      showToast.error(
        'Sync Error',
        'An error occurred while syncing workflows. Please check your connection and server status.',
        insets.top + 8
      );
      setSyncProgressText('Error listing server workflows.');
      setFailedCount(prev => prev + (fetchedFiles?.length || 0));
    } finally {
      setRefreshing(false);
    }
  }, [serverId, addWorkflow, updateWorkflow, storedWorkflows, clearServerSyncedWorkflows, insets.top]);

  useEffect(() => {
    refreshingRef.current = refreshing;
    if (!isActiveTab && refreshing) {
      console.log('ServerWorkflowsTab became inactive during sync. Cancelling...');
      cancelSyncRef.current = true;
    }
  }, [isActiveTab, refreshing]);

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

  const workflowsToDisplay = storedWorkflows.filter(wf => wf.serverId === serverId && wf.addMethod === 'server-sync');

  const renderProgress = () => (
    <HStack space="sm" className="w-full items-center justify-center py-3 px-3 bg-background-50">
      <Text className="text-xs text-typography-700 text-center">{syncProgressText}</Text>
    </HStack>
  );

  const refreshControl = (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor={refreshControlColor}
      colors={[refreshControlColor]}
      progressBackgroundColor={progressBgColor}
    />
  );

  const renderMainContent = () => {
    if (workflowsToDisplay.length === 0) {
      return (
        <ScrollView
          className="flex-1"
          contentContainerClassName="flex-grow-1 items-center justify-center pt-10 px-5"
          refreshControl={refreshControl}
        >
          <MotiView
            from={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'timing', duration: 300 }}
            className="items-center"
          >
            <Icon as={ServerCrash} size="xl" className="mb-4 h-16 w-16 text-typography-200" />
            <Text className="text-center text-xl font-medium text-typography-800 mb-5">
              Sync Workflows from Server
            </Text>

            <VStack space="lg" className="mb-8 px-4 w-full">
              <VStack space="sm" className="items-center">
                <Text className="text-center text-sm text-typography-500">
                  <Text className="font-bold">Step 1: </Text>Ensure the <Text className="font-semibold">comfy-portal-endpoint</Text> extension is installed on your ComfyUI server.
                </Text>
                <ExpoLink href="https://github.com/ShunL12324/comfy-portal-endpoint" className="mt-1">
                  <Text
                    className="text-sm text-primary-500"
                    style={{ textDecorationLine: 'underline' }}
                  >
                    How to install?
                  </Text>
                </ExpoLink>
              </VStack>

              <VStack space="sm" className="items-center">
                <Text className="text-center text-sm text-typography-500">
                  <Text className="font-bold">Step 2: </Text>Make sure at least one browser window is open and connected to your ComfyUI server.
                </Text>
              </VStack>
            </VStack>

            <Text className="text-center text-xs text-typography-400">
              Pull down to refresh
            </Text>
          </MotiView>
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
        contentContainerClassName="px-2.5 pb-20 pt-3"
        refreshControl={refreshControl}
        className="flex-1"
      />
    );
  };

  return (
    <View className="flex-1 bg-background-0">
      {refreshing && renderProgress()}
      {renderMainContent()}
    </View>
  );
};

const WorkflowsScreen = () => {
  const { serverId } = useLocalSearchParams<{ serverId: string }>();
  const server = useServersStore((state) => state.servers.find((s) => s.id === serverId));
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

  const LocalSceneComponent = useCallback(() => {
    if (!serverId) return null;
    return <LocalWorkflowsTab serverId={serverId} openImportModal={openImportModal} />;
  }, [serverId, openImportModal]);

  const ServerSceneComponent = useCallback(() => {
    if (!serverId) return null;
    const serverTabIndex = routes.findIndex(r => r.key === 'server');
    return <ServerWorkflowsTab serverId={serverId} isActiveTab={index === serverTabIndex} />;
  }, [serverId, index, routes]);

  const handleClearServerWorkflows = useCallback(() => {
    if (serverId) {
      clearServerSyncedWorkflows(serverId);
      console.log(`Cleared server-synced workflows for serverId: ${serverId}`);
    }
  }, [serverId, clearServerSyncedWorkflows]);

  const renderScene = useMemo(() => SceneMap({
    local: LocalSceneComponent,
    server: ServerSceneComponent,
  }), [LocalSceneComponent, ServerSceneComponent]);

  if (!server) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-primary-300">Server not found</Text>
      </View>
    );
  }
  if (!serverId) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-primary-300">Server ID missing</Text>
      </View>
    );
  }

  const workflows = useWorkflowStore((state) => state.workflow);
  const serverWorkflowsCount = useMemo(() =>
    workflows.filter((workflow) => workflow.serverId === serverId && workflow.addMethod === 'server-sync').length,
    [workflows, serverId]
  );

  const renderTabBar = useCallback((props: any) => {
    const rightActionButton = (
      <Pressable
        onPress={() => setIsClearAlertOpen(true)}
        disabled={index !== 1 || serverWorkflowsCount === 0}
        className={`px-3 py-2 mr-1 active:opacity-60 ${index !== 1 ? 'opacity-0' : (serverWorkflowsCount === 0 ? 'opacity-30' : 'opacity-100')}`}
      >
        <Text className={`font-medium text-base ${index !== 1 ? 'text-transparent' : 'text-error-500'}`}>Clear</Text>
      </Pressable>
    );

    return (
      <VStack className="bg-background-0">
        <AppBar
          title={server?.name || 'Workflows'}
          showBack
          centerTitle={true}
          rightElement={rightActionButton}
        />
        <HStack className="border-b border-outline-200 px-2.5 mt-[-8px]">
          {props.navigationState.routes.map((route: any, i: number) => {
            const isActive = index === i;
            return (
              <Pressable
                key={route.key}
                onPress={() => setIndex(i)}
                className="flex-1"
              >
                <VStack className="items-center py-3">
                  <Text
                    className={`text-sm font-medium ${isActive ? 'text-primary-500' : 'text-typography-500'
                      }`}
                  >
                    {route.title}
                  </Text>
                </VStack>
                {isActive && (
                  <View className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500" />
                )}
              </Pressable>
            );
          })}
        </HStack>
      </VStack>
    );
  }, [index, server, setIndex, routes, handleClearServerWorkflows]);

  return (
    <View className={`flex-1 bg-background-0`}>
      <RNETabView
        navigationState={{ index, routes }}
        renderScene={renderScene}
        onIndexChange={setIndex}
        initialLayout={{ width: layout.width }}
        renderTabBar={renderTabBar}
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
        description="This will remove all workflows synced from this server. This action cannot be undone."
        confirmText="Clear"
        confirmButtonColor="bg-error-500"
      />
    </View>
  );
};

export default WorkflowsScreen;
