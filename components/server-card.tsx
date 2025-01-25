import React from 'react';
import { TouchableOpacity } from 'react-native';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { Text } from '@/components/ui/text';
import { MotiView } from 'moti';
import {
  Activity,
  Server,
  Edit2,
  Globe,
  Hash,
  Trash2,
  Layers,
} from 'lucide-react-native';
import { EditServerModal } from './edit-server-modal';
import { router } from 'expo-router';
import { useServersStore } from '@/store/servers';
import {
  AlertDialog,
  AlertDialogBackdrop,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogBody,
  AlertDialogFooter,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { ButtonText } from '@/components/ui/button';
import { Heading } from '@/components/ui/heading';

interface ServerCardProps {
  id: string;
  index?: number;
}

export const ServerCard = ({ id, index = 0 }: ServerCardProps) => {
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = React.useState(false);
  const removeServer = useServersStore((state) => state.removeServer);
  const server = useServersStore((state) =>
    state.servers.find((s) => s.id === id),
  );

  if (!server) return null;

  const { name, host, port, status, latency, models } = server;

  const handlePress = () => {
    router.push(`/preset/${id}`);
  };

  const handleDelete = () => {
    removeServer(id);
    setIsDeleteAlertOpen(false);
  };

  return (
    <>
      <MotiView
        from={{ opacity: 0, scale: 0.98, translateY: 10 }}
        animate={{ opacity: 1, scale: 1, translateY: 0 }}
        transition={{
          type: 'timing',
          duration: 300,
          delay: index * 100,
        }}
      >
        <TouchableOpacity
          onPress={handlePress}
          activeOpacity={0.8}
          className="overflow-hidden rounded-xl bg-background-50"
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.06,
            shadowRadius: 15,
          }}
        >
          <HStack className="items-center justify-between p-3.5">
            <HStack space="md" className="flex-1 items-center">
              <HStack className="h-14 w-14 items-center justify-center rounded-lg bg-background-0">
                <Server size={22} className="text-primary-500" />
              </HStack>
              <VStack space="xs" className="min-w-0 flex-1">
                <Text
                  className="text-base font-semibold text-primary-500"
                  numberOfLines={1}
                >
                  {name}
                </Text>
                <VStack space="xs" className="mt-0.5">
                  <HStack space="xs" className="items-center">
                    <Globe size={12} className="shrink-0 text-primary-300" />
                    <Text
                      className="flex-shrink text-xs text-primary-400"
                      numberOfLines={1}
                    >
                      {host}
                    </Text>
                  </HStack>
                  <HStack space="xs" className="items-center">
                    <Hash size={12} className="shrink-0 text-primary-300" />
                    <Text
                      className="text-xs text-primary-400"
                      numberOfLines={1}
                    >
                      {port}
                    </Text>
                  </HStack>
                  <HStack space="xs" className="items-center">
                    <Layers size={12} className="shrink-0 text-primary-300" />
                    <Text
                      className="text-xs text-primary-400"
                      numberOfLines={1}
                    >
                      {models?.length || 'No'} models
                    </Text>
                  </HStack>
                </VStack>
              </VStack>
            </HStack>

            <VStack space="md" className="ml-4 shrink-0 py-1">
              <HStack space="sm" className="mb-auto">
                <TouchableOpacity
                  onPress={() => setIsEditModalOpen(true)}
                  className="h-8 w-8 items-center justify-center rounded-lg bg-background-0 active:bg-background-100"
                >
                  <Edit2 size={13} className="text-primary-500" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setIsDeleteAlertOpen(true)}
                  className="h-8 w-8 items-center justify-center rounded-lg bg-background-0 active:bg-background-100"
                >
                  <Trash2 size={13} className="text-error-600" />
                </TouchableOpacity>
              </HStack>
              <HStack
                space="xs"
                className={`items-center rounded-lg px-2 py-1 ${
                  status === 'online' ? 'bg-success-50' : 'bg-error-50'
                }`}
              >
                <Activity
                  size={10}
                  className={
                    status === 'online' ? 'text-success-600' : 'text-error-600'
                  }
                />
                <Text
                  className={`text-xs font-medium ${
                    status === 'online' ? 'text-success-700' : 'text-error-700'
                  }`}
                >
                  {status === 'online' ? `${latency}ms` : 'Offline'}
                </Text>
              </HStack>
            </VStack>
          </HStack>
        </TouchableOpacity>
      </MotiView>

      <EditServerModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        server={{ id, name, host, port, status, latency }}
      />

      <AlertDialog
        isOpen={isDeleteAlertOpen}
        onClose={() => setIsDeleteAlertOpen(false)}
      >
        <AlertDialogBackdrop />
        <AlertDialogContent className="rounded-xl bg-background-0">
          <AlertDialogHeader>
            <Heading size="sm">Delete Server</Heading>
          </AlertDialogHeader>
          <AlertDialogBody>
            <Text className="text-sm text-primary-400">
              Are you sure you want to delete this server? This action cannot be
              undone.
            </Text>
          </AlertDialogBody>
          <AlertDialogFooter>
            <Button
              variant="outline"
              onPress={() => setIsDeleteAlertOpen(false)}
              className="flex-1 rounded-xl bg-background-50"
            >
              <ButtonText className="text-primary-400">Cancel</ButtonText>
            </Button>
            <Button
              variant="solid"
              onPress={handleDelete}
              className="flex-1 rounded-xl bg-error-500 active:bg-error-600"
            >
              <ButtonText className="text-background-0">Delete</ButtonText>
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
