import React, { useEffect, useState } from 'react';
import { TouchableOpacity, View } from 'react-native';
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
  Unplug,
  Loader,
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
import { Icon } from './ui/icon';

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
  <View className="flex-1 flex-row items-center gap-2">
    <View className="h-24 w-24 items-center justify-center rounded-lg bg-background-0">
      <Icon as={Server} size="xl" className="text-typography-300" />
    </View>
    <View className="min-w-0 flex-1">
      <Text
        className="text-base font-semibold text-primary-500"
        numberOfLines={1}
      >
        {name}
      </Text>
      <View className="mt-0.5 flex-col gap-1">
        <View className="flex-row items-center gap-1">
          <Globe size={12} className="shrink-0 text-primary-300" />
          <Text
            className="flex-shrink text-xs text-primary-400"
            numberOfLines={1}
          >
            {host}
          </Text>
        </View>
        <View className="flex-row items-center gap-1">
          <Hash size={12} className="shrink-0 text-primary-300" />
          <Text className="text-xs text-primary-400" numberOfLines={1}>
            {port}
          </Text>
        </View>
        <View className="flex-row items-center gap-1">
          <Layers size={12} className="shrink-0 text-primary-300" />
          <Text className="text-xs text-primary-400" numberOfLines={1}>
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
      <Edit2 size={13} className="text-primary-500" />
    </TouchableOpacity>
    <TouchableOpacity
      onPress={onDelete}
      className="h-8 w-8 items-center justify-center rounded-lg bg-background-0 active:bg-background-100"
    >
      <Trash2 size={13} className="text-error-600" />
    </TouchableOpacity>
  </View>
);

const ServerStatus = ({ status, latency, isRefreshing }: ServerStatusProps) => (
  <TouchableOpacity
    disabled={isRefreshing}
    className={`items-center rounded-md px-2 py-2 ${
      status === 'online' ? 'bg-success-50' : 'bg-background-100'
    }`}
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
          <Icon as={Loader} className="h-4 w-4 text-typography-400" />
        </MotiView>
      ) : status === 'online' ? (
        <Icon as={Activity} size="sm" className="text-success-400" />
      ) : (
        <Icon as={Unplug} size="sm" className="text-typography-400" />
      )}
      {!isRefreshing && (
        <Text
          className={`text-2xs font-medium ${
            status === 'online' ? 'text-success-700' : 'text-typography-400'
          }`}
        >
          {status === 'online' ? `${latency?.toString()}ms` : 'Offline'}
        </Text>
      )}
    </MotiView>
  </TouchableOpacity>
);

const DeleteAlert = ({
  isOpen,
  onClose,
  onDelete,
}: {
  isOpen: boolean;
  onClose: () => void;
  onDelete: () => void;
}) => (
  <AlertDialog isOpen={isOpen} onClose={onClose}>
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
          onPress={onClose}
          className="flex-1 rounded-xl bg-background-50"
        >
          <ButtonText className="text-primary-400">Cancel</ButtonText>
        </Button>
        <Button
          variant="solid"
          onPress={onDelete}
          className="flex-1 rounded-xl bg-error-500 active:bg-error-600"
        >
          <ButtonText className="text-background-0">Delete</ButtonText>
        </Button>
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
  const server = useServersStore((state) =>
    state.servers.find((s) => s.id === id),
  );

  if (!server) return null;

  const { name, host, port, status, latency, models } = server;

  useEffect(() => {
    setIsRefreshing(server.status === 'refreshing');
  }, [server]);

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
          <View className="flex-row items-center justify-between p-3.5">
            <ServerInfo name={name} host={host} port={port} models={models} />
            <View className="ml-4 h-24 w-20 flex-col justify-between">
              <ActionButtons
                onEdit={() => setIsEditModalOpen(true)}
                onDelete={() => setIsDeleteAlertOpen(true)}
              />
              <ServerStatus
                status={status}
                latency={latency}
                isRefreshing={isRefreshing}
              />
            </View>
          </View>
        </TouchableOpacity>
      </MotiView>

      <EditServerModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        server={{ id, name, host, port, status, latency }}
      />

      <DeleteAlert
        isOpen={isDeleteAlertOpen}
        onClose={() => setIsDeleteAlertOpen(false)}
        onDelete={handleDelete}
      />
    </>
  );
};
