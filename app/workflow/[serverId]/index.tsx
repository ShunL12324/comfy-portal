import { AppBar } from '@/components/layout/app-bar';
import { AddWorkflowModal } from '@/components/pages/workflow/add-workflow-modal';
import { ImportWorkflowModal } from '@/components/pages/workflow/import-workflow-modal';
import { WorkflowCard } from '@/components/pages/workflow/workflow-card';
import { Button } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { ScrollView } from '@/components/ui/scroll-view';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { VStack } from '@/components/ui/vstack';
import { useServersStore } from '@/store/servers';
import { useWorkflowStore } from '@/store/workflow';
import { useLocalSearchParams } from 'expo-router';
import { Import, Plus } from 'lucide-react-native';
import React, { useState } from 'react';

const WorkflowsScreen = () => {
  const { serverId } = useLocalSearchParams();
  const server = useServersStore((state) => state.servers.find((s) => s.id === serverId));
  const workflows = useWorkflowStore((state) => state.workflow);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  if (!server) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-primary-300">Server not found</Text>
      </View>
    );
  }

  const filteredWorkflows = workflows.filter((workflow) => workflow.serverId === serverId);

  return (
    <View className={`flex-1 bg-background-0`}>
      <AppBar
        title="Workflows"
        showBack
        bottomElement={
          <HStack space="sm" className="items-center">
            <Button
              variant="solid"
              action="primary"
              size="md"
              className="h-11 flex-1 rounded-xl bg-background-50 data-[focus=true]:bg-background-0 data-[active=true]:bg-background-0"
              onPress={() => setIsImportModalOpen(true)}
            >
              <Icon as={Import} size="md" className="mr-2 text-primary-500" />
              <Text className="text-sm font-medium text-typography-900">Import</Text>
            </Button>
            <Button
              variant="solid"
              action="secondary"
              size="md"
              className="h-11 flex-1 rounded-xl bg-background-50 data-[focus=true]:bg-background-0 data-[active=true]:bg-background-0"
              onPress={() => setIsAddModalOpen(true)}
            >
              <Icon as={Plus} size="md" className="text-primary-500" />
              <Text className="text-sm font-medium text-typography-900">Use Preset</Text>
            </Button>
          </HStack>
        }
      />

      <ScrollView className="flex-1">
        <VStack space="md" className="px-5 pb-6">
          {filteredWorkflows.map((workflowRecord) => (
            <WorkflowCard key={workflowRecord.id} id={workflowRecord.id} />
          ))}
        </VStack>
      </ScrollView>

      <ImportWorkflowModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        serverId={serverId as string}
      />
      <AddWorkflowModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        serverId={serverId as string}
      />
    </View>
  );
};

export default WorkflowsScreen;
