import {
  AlertDialog,
  AlertDialogBackdrop,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
} from '@/components/ui/alert-dialog';
import { Button, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Menu, MenuItem, MenuItemLabel } from '@/components/ui/menu';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { useServersStore } from '@/features/server/stores/server-store';
import { router } from 'expo-router';
import { EllipsisVertical, Loader, Server, Settings2, Trash2 } from 'lucide-react-native';
import { MotiView } from 'moti';
import React, { useRef, useState } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { EditServerModal, type EditServerModalRef } from './edit-server-modal';

// Types
interface ServerCardProps {
  id: string;
  index?: number;
}

interface ServerInfoProps {
  name: string;
  host: string;
  port: number;
  models?: any[];
  status: 'online' | 'offline' | 'refreshing';
  latency?: number;
}

interface ActionMenuProps {
  onEdit: () => void;
  onDelete: () => void;
}

// Sub-components
const ServerInfo = ({ name, host, port, models, status, latency }: ServerInfoProps) => {
  const isRefreshing = status === 'refreshing';
  const isOnline = status === 'online';

  return (
    <HStack space="md" className="flex-1 items-center">
      <View className="h-16 w-16 items-center justify-center rounded-lg bg-background-0 p-2">
        <Icon as={Server} size="xl" className="text-primary-500" />
      </View>
      <VStack space="xs" className="flex-1">
        <HStack space="sm" className="items-center">
          {isRefreshing ? (
            <MotiView
              from={{ rotate: '0deg' }}
              animate={{ rotate: '360deg' }}
              transition={{ loop: true, type: 'timing', duration: 1000 }}
              className="h-4 w-4 items-center justify-center"
            >
              <Icon as={Loader} size="sm" className="text-primary-500" />
            </MotiView>
          ) : (
            <View
              className={`h-2 w-2 rounded-full ${isOnline ? 'bg-success-500' : 'bg-typography-400'}`}
            />
          )}
          <Text className="flex-1 text-base font-semibold text-typography-950" numberOfLines={1}>
            {name}
          </Text>
        </HStack>
        <Text className="text-xs text-typography-500" numberOfLines={1}>
          {host}:{port} • {models?.length ?? 'No'} models
          {isOnline && latency !== undefined ? ` • ${latency}ms` : ''}
          {!isOnline && !isRefreshing ? ' • Offline' : ''}
        </Text>
      </VStack>
    </HStack>
  );
};

const ActionMenu = ({ onEdit, onDelete }: ActionMenuProps) => (
  <Menu
    placement="bottom right"
    className="rounded-xl border border-background-200 bg-background-100 p-1"
    trigger={({ ...triggerProps }) => {
      return (
        <TouchableOpacity {...triggerProps} className="h-9 w-9 items-center justify-center rounded-md">
          <Icon as={EllipsisVertical} size="md" className="text-typography-500" />
        </TouchableOpacity>
      );
    }}
  >
    <MenuItem
      key="edit"
      textValue="Edit"
      onPress={onEdit}
      className="rounded-lg p-3 data-[focus=true]:bg-background-200 data-[active=true]:bg-background-200"
    >
      <Icon as={Settings2} size="sm" className="mr-2 text-typography-700" />
      <MenuItemLabel size="sm">Edit</MenuItemLabel>
    </MenuItem>
    <MenuItem
      key="delete"
      textValue="Delete"
      onPress={onDelete}
      className="rounded-lg p-3 data-[focus=true]:bg-background-200 data-[active=true]:bg-background-200"
    >
      <Icon as={Trash2} size="sm" className="mr-2 text-error-600" />
      <MenuItemLabel size="sm" className="text-error-600">
        Delete
      </MenuItemLabel>
    </MenuItem>
  </Menu>
);

const DeleteAlert = ({ isOpen, onClose, onDelete }: { isOpen: boolean; onClose: () => void; onDelete: () => void }) => (
  <AlertDialog isOpen={isOpen} onClose={onClose}>
    <AlertDialogBackdrop onPress={onClose} />
    <AlertDialogContent className="max-w-md overflow-hidden rounded-xl border-0 bg-background-200">
      <AlertDialogHeader className="px-0">
        <Text className="text-lg font-semibold text-typography-950">Delete Server</Text>
      </AlertDialogHeader>
      <AlertDialogBody className="px-0 py-4">
        <Text className="text-sm text-typography-400">
          Are you sure you want to delete this server? This action cannot be undone.
        </Text>
      </AlertDialogBody>
      <AlertDialogFooter className="px-0">
        <HStack space="sm" className="py-0">
          <Button variant="outline" onPress={onClose} className="flex-1 rounded-md bg-background-100">
            <ButtonText className="text-sm text-typography-400">Cancel</ButtonText>
          </Button>
          <Button variant="solid" onPress={onDelete} className="flex-1 rounded-md bg-error-500 active:bg-error-600">
            <ButtonText className="text-sm text-typography-900">Delete</ButtonText>
          </Button>
        </HStack>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

// Main component
export const ServerCard = ({ id, index = 0 }: ServerCardProps) => {
  const editModalRef = useRef<EditServerModalRef>(null);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const removeServer = useServersStore((state) => state.removeServer);
  const server = useServersStore((state) => state.servers.find((s) => s.id === id));

  if (!server) return null;

  const { name, host, port, status, latency, models } = server;

  const handleEdit = () => {
    editModalRef.current?.present();
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
          onPress={() => router.push(`/workflow/${id}`)}
          activeOpacity={0.8}
          className="overflow-hidden rounded-xl bg-background-50 p-3.5"
        >
          <HStack space="sm" className="items-center justify-between">
            <ServerInfo name={name} host={host} port={port} models={models} status={status} latency={latency} />
            <ActionMenu onEdit={handleEdit} onDelete={() => setIsDeleteAlertOpen(true)} />
          </HStack>
        </TouchableOpacity>
      </MotiView>

      <EditServerModal ref={editModalRef} serverId={id} />

      <DeleteAlert
        isOpen={isDeleteAlertOpen}
        onClose={() => setIsDeleteAlertOpen(false)}
        onDelete={() => {
          removeServer(id);
          setIsDeleteAlertOpen(false);
        }}
      />
    </>
  );
};
