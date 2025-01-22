import React, { useState } from 'react';
import { ScrollView } from '@/components/ui/scroll-view';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { Pressable } from '@/components/ui/pressable';
import { Button } from '@/components/ui/button';
import { useWorkflowsStore } from '@/store/workflows';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useServersStore } from '@/store/servers';
import { Upload, Play, Clock } from 'lucide-react-native';
import { MotiView } from 'moti';
import * as DocumentPicker from 'expo-document-picker';
import { Icon } from '@/components/ui/icon';
import { AddWorkflowModal } from '@/components/add-workflow-modal';
import { AppBar } from '@/components/layout/app-bar';
import { Image } from '@/components/ui/image';

export default function WorkflowsScreen() {
  const { serverId } = useLocalSearchParams();
  const server = useServersStore((state) =>
    state.servers.find((s) => s.id === serverId),
  );
  const workflows = useWorkflowsStore((state) => state.workflows);
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState<{
    uri: string;
    name: string;
  } | null>(null);

  const handleImportWorkflow = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
      });

      if (result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        setSelectedFile({
          uri: file.uri,
          name: file.name,
        });
      }
    } catch (error) {
      console.error('Error picking document:', error);
    }
  };

  const handleRunWorkflow = (workflowId: string) => {
    router.push(`/workflow/${serverId}/run/${workflowId}`);
  };

  if (!server) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-primary-300">Server not found</Text>
      </View>
    );
  }

  const filteredWorkflows = workflows.filter(
    (workflow) => workflow.serverId === serverId,
  );

  return (
    <VStack className="flex-1 bg-background-0">
      <AppBar
        showBack
        title="Workflows"
        rightElement={
          <Button
            variant="outline"
            action="primary"
            onPress={handleImportWorkflow}
            className="h-9 rounded-xl bg-background-50 active:bg-background-100"
            size="sm"
          >
            <Icon as={Upload} size="sm" className="mr-2 text-primary-500" />
            <Text className="font-medium text-primary-500">Import</Text>
          </Button>
        }
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingTop: 80,
          paddingBottom: 24,
        }}
      >
        <VStack space="lg" className="px-5">
          {filteredWorkflows.length === 0 ? (
            <VStack className="items-center justify-center py-12">
              <Text className="text-center text-base text-primary-300">
                No workflows found. Import one to get started.
              </Text>
            </VStack>
          ) : (
            <VStack space="md">
              {filteredWorkflows.map((workflow) => (
                <MotiView
                  key={workflow.id}
                  from={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: 'timing', duration: 150 }}
                >
                  <Pressable className="overflow-hidden rounded-2xl bg-background-50">
                    <VStack>
                      <Image
                        source={{ uri: 'https://picsum.photos/800/400' }}
                        alt={workflow.name}
                        className="h-40 w-full bg-background-100"
                      />
                      <VStack className="p-4">
                        <HStack className="items-start justify-between">
                          <VStack space="xs" className="flex-1">
                            <Text className="text-base font-semibold text-primary-500">
                              {workflow.name}
                            </Text>
                            {workflow.description && (
                              <Text className="text-sm text-primary-300">
                                {workflow.description}
                              </Text>
                            )}
                          </VStack>
                          <Button
                            variant="solid"
                            action="primary"
                            size="sm"
                            onPress={() => handleRunWorkflow(workflow.id)}
                            className="ml-3 h-9 rounded-xl bg-primary-500 active:bg-primary-600"
                          >
                            <Icon
                              as={Play}
                              size="sm"
                              className="mr-1.5 text-background-0"
                            />
                            <Text className="font-medium text-background-0">
                              Run
                            </Text>
                          </Button>
                        </HStack>

                        {workflow.tags && workflow.tags.length > 0 && (
                          <HStack space="xs" className="mt-3 flex-wrap">
                            {workflow.tags.map((tag) => (
                              <Text
                                key={tag}
                                className="rounded-lg bg-background-100 px-2 py-1 text-xs font-medium text-primary-400"
                              >
                                {tag}
                              </Text>
                            ))}
                          </HStack>
                        )}

                        <HStack className="mt-4 items-center border-t border-background-100 pt-3">
                          <HStack space="xs" className="items-center">
                            <Icon
                              as={Clock}
                              size="sm"
                              className="text-primary-300"
                            />
                            <Text className="text-xs text-primary-300">
                              Last run: Never
                            </Text>
                          </HStack>
                        </HStack>
                      </VStack>
                    </VStack>
                  </Pressable>
                </MotiView>
              ))}
            </VStack>
          )}
        </VStack>
      </ScrollView>

      {selectedFile && (
        <AddWorkflowModal
          isOpen={!!selectedFile}
          onClose={() => setSelectedFile(null)}
          file={selectedFile}
          serverId={serverId as string}
        />
      )}
    </VStack>
  );
}
