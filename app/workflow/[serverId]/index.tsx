import { AppBar } from '@/components/layout/app-bar';
import { AddWorkflowModal } from '@/components/pages/workflow/add-workflow-modal';
import { WorkflowCard } from '@/components/pages/workflow/workflow-card';
import { Button } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { AddIcon, Icon } from '@/components/ui/icon';
import { ScrollView } from '@/components/ui/scroll-view';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { VStack } from '@/components/ui/vstack';
import { useServersStore } from '@/store/servers';
import { useWorkflowStore } from '@/store/workflow';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';

const WorkflowsScreen = () => {
  const { serverId } = useLocalSearchParams();
  const server = useServersStore((state) => state.servers.find((s) => s.id === serverId));
  const workflows = useWorkflowStore((state) => state.workflow);
  const router = useRouter();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const handleAddWorkflow = () => {
    setIsAddModalOpen(true);
  };

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
          <Button
            variant="solid"
            action="primary"
            size="md"
            className="mt-2 h-11 rounded-xl bg-background-50 data-[focus=true]:bg-background-0 data-[active=true]:bg-background-0"
            onPress={handleAddWorkflow}
          >
            <HStack space="sm" className="items-center justify-center">
              <Icon as={AddIcon} size="md" className="text-accent-500" />
              <Text className="text-sm font-medium text-typography-900">Add Workflow</Text>
            </HStack>
          </Button>
        }
      />

      <ScrollView className="flex-1">
        <VStack space="md" className="px-5 pb-6">
          {filteredWorkflows.map((workflowRecord) => (
            <WorkflowCard key={workflowRecord.id} id={workflowRecord.id} />
          ))}
        </VStack>
      </ScrollView>

      <AddWorkflowModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        serverId={serverId as string}
      />
    </View>
  );
};

export default WorkflowsScreen;
