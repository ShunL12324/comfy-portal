import { EditWorkflowModal } from '@/components/pages/workflow/edit-workflow-modal';
import {
  AlertDialog,
  AlertDialogBackdrop,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
} from '@/components/ui/alert-dialog';
import { Button, ButtonText } from '@/components/ui/button';
import { Heading } from '@/components/ui/heading';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Image } from '@/components/ui/image';
import { Text } from '@/components/ui/text';
import { useWorkflowStore } from '@/store/workflow';
import { useRouter } from 'expo-router';
import { Edit2, ImageIcon, Trash2 } from 'lucide-react-native';
import React from 'react';
import { Pressable, TouchableOpacity, View } from 'react-native';

interface WorkflowCardProps {
  id: string;
}

export const WorkflowCard = ({ id }: WorkflowCardProps) => {
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = React.useState(false);
  const removeWorkflow = useWorkflowStore((state) => state.removeWorkflow);
  const workflowRecord = useWorkflowStore((state) => state.workflow.find((p) => p.id === id));

  if (!workflowRecord) return null;

  const router = useRouter();

  const handleDelete = () => {
    removeWorkflow(id);
    setIsDeleteAlertOpen(false);
  };

  return (
    <>
      <Pressable
        className="active:scale-98 overflow-hidden rounded-xl bg-background-50 active:opacity-80"
        onPress={() => router.push(`/workflow/${workflowRecord?.serverId}/run/${workflowRecord?.id}`)}
      >
        {/* Top Image Section */}
        <View className="h-64 w-full bg-background-100">
          {workflowRecord?.thumbnail ? (
            <Image
              source={{ uri: workflowRecord?.thumbnail }}
              className="w-full flex-1"
              alt="Workflow thumbnail"
              onError={(error) => {
                console.error('[WorkflowCard] Failed to load thumbnail:', error.nativeEvent.error);
                // Only clear invalid thumbnail if the file doesn't exist
                if (error.nativeEvent.error.includes('no such file')) {
                  useWorkflowStore.getState().updateWorkflow(id, { thumbnail: undefined });
                }
              }}
            />
          ) : (
            <View className="flex-1 items-center justify-center">
              <Icon as={ImageIcon} size="xl" className="h-8 w-8 text-accent-500" />
            </View>
          )}
        </View>

        {/* Bottom Info Section */}
        <View className="p-3">
          <Text className="text-base font-semibold text-typography-950" numberOfLines={1}>
            {workflowRecord.name}
          </Text>

          <View className="mt-2 flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-xs text-typography-400" numberOfLines={1}>
                {'No model selected'}
              </Text>
              <Text className="mt-1 text-xs text-typography-400">Last used: {'Never'}</Text>
            </View>

            <View className="ml-2 flex-row gap-2">
              <TouchableOpacity
                onPress={() => setIsEditModalOpen(true)}
                className="h-8 w-8 items-center justify-center rounded-md bg-background-0 active:bg-background-100"
              >
                <Icon as={Edit2} size="sm" className="text-accent-500" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setIsDeleteAlertOpen(true)}
                className="h-8 w-8 items-center justify-center rounded-md bg-background-0 active:bg-background-100"
              >
                <Icon as={Trash2} size="sm" className="text-error-600" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Pressable>

      <EditWorkflowModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} workflowId={id} />

      <AlertDialog isOpen={isDeleteAlertOpen} onClose={() => setIsDeleteAlertOpen(false)}>
        <AlertDialogBackdrop />
        <AlertDialogContent className="max-w-md overflow-hidden rounded-xl border-0 bg-background-200">
          <AlertDialogHeader className="px-0">
            <Heading size="sm" className="text-typography-950">
              Delete Workflow
            </Heading>
          </AlertDialogHeader>
          <AlertDialogBody className="px-0 py-4">
            <Text className="text-sm text-typography-400">
              Are you sure you want to delete this workflow? This action cannot be undone.
            </Text>
          </AlertDialogBody>
          <AlertDialogFooter className="px-0">
            <HStack space="sm" className="py-0">
              <Button
                variant="outline"
                onPress={() => setIsDeleteAlertOpen(false)}
                className="flex-1 rounded-md bg-background-100"
              >
                <ButtonText className="text-sm text-typography-400">Cancel</ButtonText>
              </Button>
              <Button
                variant="solid"
                onPress={handleDelete}
                className="flex-1 rounded-md bg-error-500 active:bg-error-600"
              >
                <ButtonText className="text-sm text-typography-900">Delete</ButtonText>
              </Button>
            </HStack>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
