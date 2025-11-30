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
import { VStack } from '@/components/ui/vstack';
import { EditWorkflowModal } from '@/features/workflow/components/edit-workflow-modal';
import { useWorkflowStore } from '@/features/workflow/stores/workflow-store';
import { formatDateToYYYYMMDD } from '@/utils/date';
import { useRouter } from 'expo-router';
import { ImageIcon, Settings2 } from 'lucide-react-native';
import React from 'react';
import { Pressable, View } from 'react-native';

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
        className="active:scale-98 overflow-hidden rounded-xl bg-background-50 active:opacity-90 shadow-lg shadow-black/5 relative"
        onPress={() => router.push(`/workflow/${workflowRecord?.serverId}/run/${workflowRecord?.id}`)}
      >
        {/* Top Image Section */}
        <View className="h-48 w-full bg-background-100">
          {workflowRecord?.thumbnail ? (
            <Image
              source={{ uri: workflowRecord?.thumbnail }}
              className="w-full flex-1"
              alt={workflowRecord.name || 'Workflow thumbnail'}
              onError={(error) => {
                console.error('[WorkflowCard] Failed to load thumbnail:', error.nativeEvent.error);
                if (error.nativeEvent.error.includes('no such file')) {
                  useWorkflowStore.getState().updateWorkflow(id, { thumbnail: undefined });
                }
              }}
            />
          ) : (
            <View className="flex-1 items-center justify-center bg-background-200">
              <Icon as={ImageIcon} size="xl" className="h-10 w-10 text-typography-400" />
            </View>
          )}
        </View>

        {/* Bottom Info Section - Revised Structure */}
        <View className="p-4">
          <Heading size="sm" className="text-typography-900" numberOfLines={1}>
            {workflowRecord.name}
          </Heading>

          <VStack className="mt-2 space-y-1">
            <Text className="text-xs text-typography-500">
              Last used: {workflowRecord.lastUsed ? formatDateToYYYYMMDD(workflowRecord.lastUsed) : 'Never'}
            </Text>
            {workflowRecord.addMethod === 'server-sync' && workflowRecord.metadata?.originalFilename && (
              <Text className="text-xs text-typography-400" numberOfLines={1}>
                Path: {String(workflowRecord.metadata.originalFilename)}
              </Text>
            )}
          </VStack>
        </View>

        {/* Settings Icon - Positioned absolutely at top-right, now directly opens Edit Modal */}
        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            setIsEditModalOpen(true);
          }}
          className="absolute top-2 right-2 z-10 h-8 w-8 items-center justify-center rounded-md bg-black/20 active:bg-black/30"
        >
          <Icon as={Settings2} size="sm" className="text-white" />
        </Pressable>
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
