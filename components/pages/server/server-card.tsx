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
import { Text } from '@/components/ui/text';
import { useServersStore } from '@/store/servers';
import { router } from 'expo-router';
import { Activity, Edit2, Globe, Hash, Layers, Loader, Server, Trash2, Unplug } from 'lucide-react-native';
import { MotiView } from 'moti';
import React, { useEffect, useState } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { Icon } from '../../ui/icon';
import { EditServerModal } from './edit-server-modal';

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
}

interface ServerStatusProps {
  status: 'online' | 'offline' | 'refreshing';
  latency?: number;
  isRefreshing: boolean;
}

interface ActionButtonsProps {
  onEdit: () => void;
  onDelete: () => void;
}

// Sub-components
const ServerInfo = ({ name, host, port, models }: ServerInfoProps) => (
  <View className="h-full flex-1 flex-row items-center gap-4">
    <View className="h-24 w-24 items-center justify-center rounded-lg bg-background-0">
      <Icon as={Server} size="xl" className="text-accent-500" />
    </View>
    <View className="h-full min-w-0 flex-1 items-start justify-start">
      <Text className="text-base font-semibold text-typography-950" numberOfLines={1}>
        {name}
      </Text>
      <View className="mt-2 flex-col gap-1">
        <View className="flex-row items-center gap-1">
          <Icon as={Globe} size="2xs" className="shrink-0 text-accent-500" />
          <Text className="flex-shrink text-2xs text-typography-400" numberOfLines={1}>
            {host}
          </Text>
        </View>
        <View className="flex-row items-center gap-1">
          <Icon as={Hash} size="2xs" className="shrink-0 text-accent-500" />
          <Text className="text-2xs text-typography-400" numberOfLines={1}>
            {port}
          </Text>
        </View>
        <View className="flex-row items-center gap-1">
          <Icon as={Layers} size="2xs" className="shrink-0 text-accent-500" />
          <Text className="text-2xs text-typography-400" numberOfLines={1}>
            {models?.length || 'No'} models
          </Text>
        </View>
      </View>
    </View>
  </View>
);

const ActionButtons = ({ onEdit, onDelete }: ActionButtonsProps) => (
  <View className="mb-auto flex-row items-center justify-between">
    <TouchableOpacity
      onPress={onEdit}
      className="h-8 w-8 items-center justify-center rounded-md bg-background-0 active:bg-background-100"
    >
      <Icon as={Edit2} size="xs" className="text-accent-500" />
    </TouchableOpacity>
    <TouchableOpacity
      onPress={onDelete}
      className="h-8 w-8 items-center justify-center rounded-lg bg-background-0 active:bg-background-100"
    >
      <Icon as={Trash2} size="xs" className="text-error-600" />
    </TouchableOpacity>
  </View>
);

const ServerStatus = ({ status, latency, isRefreshing }: ServerStatusProps) => (
  <TouchableOpacity
    disabled={isRefreshing}
    className={`items-center rounded-md px-2 py-2 ${status === 'online' ? 'bg-success-50' : 'bg-background-0'}`}
  >
    <MotiView
      from={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{
        type: 'spring',
        damping: 20,
        mass: 0.8,
      }}
      className="w-full flex-row items-center justify-around"
    >
      {isRefreshing ? (
        <MotiView
          from={{ rotate: '0deg' }}
          animate={{ rotate: '360deg' }}
          transition={{
            loop: true,
            type: 'timing',
            duration: 1000,
          }}
        >
          <Icon as={Loader} size="sm" className="text-accent-500" />
        </MotiView>
      ) : status === 'online' ? (
        <Icon as={Activity} size="sm" className="text-success-400" />
      ) : (
        <Icon as={Unplug} size="sm" className="text-typography-400" />
      )}
      {!isRefreshing && (
        <Text className={`text-2xs font-medium ${status === 'online' ? 'text-success-700' : 'text-typography-400'}`}>
          {status === 'online' ? `${latency?.toString()}ms` : 'Offline'}
        </Text>
      )}
    </MotiView>
  </TouchableOpacity>
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
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const removeServer = useServersStore((state) => state.removeServer);
  const server = useServersStore((state) => state.servers.find((s) => s.id === id));

  if (!server) return null;

  const { name, host, port, status, latency, models } = server;

  useEffect(() => {
    setIsRefreshing(server.status === 'refreshing');
  }, [server]);

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
          className="overflow-hidden rounded-xl bg-background-50"
        >
          <View className="flex-row items-center justify-between p-3.5">
            <ServerInfo name={name} host={host} port={port} models={models} />
            <View className="ml-4 h-24 w-20 flex-col justify-between">
              <ActionButtons onEdit={() => setIsEditModalOpen(true)} onDelete={() => setIsDeleteAlertOpen(true)} />
              <ServerStatus status={status} latency={latency} isRefreshing={isRefreshing} />
            </View>
          </View>
        </TouchableOpacity>
      </MotiView>

      <EditServerModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} serverId={id} />

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
