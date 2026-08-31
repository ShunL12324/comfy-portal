import { accruedCost, formatUptime, formatUsd } from '@/features/cloud/utils/cost';
import {
  AlertDialog,
  AlertDialogBackdrop,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
} from '@/components/ui/alert-dialog';
import { StatusDot } from '@/components/self-ui/status-pill';
import { Button, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Menu, MenuItem, MenuItemLabel } from '@/components/ui/menu';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { useServersStore } from '@/features/server/stores/server-store';
import { router } from 'expo-router';
import { EllipsisVertical, Settings2, Trash2 } from 'lucide-react-native';
import { MotiView } from 'moti';
import React, { useRef, useState } from 'react';
import { TouchableOpacity } from 'react-native';
import { EditServerModal, type EditServerModalRef } from './edit-server-modal';

/**
 * One server, as a row in a list — not a card.
 *
 * The rows share a single hairline container (the screen draws it, so the
 * boundary between two servers is one line rather than a gap between two
 * boxes), and every latency lines up down the right edge in mono. That column
 * is the point: three servers should be scannable as three numbers, which a
 * stack of self-contained cards behind leading icon tiles never allowed.
 *
 * While a refresh is in flight the latency drops to an em dash and returns
 * with the new number — the state shows in the data rather than in a spinner
 * laid over the top of it.
 */

interface ServerCardProps {
  id: string;
  index?: number;
  /** Rows draw their own top hairline; the first in a container doesn't. */
  isFirst?: boolean;
}

interface ActionMenuProps {
  onEdit: () => void;
  onDelete: () => void;
}

/**
 * Edit and delete have to live somewhere, and the component sheet's row is
 * pure data with no affordance for them. A narrow, muted trigger after the
 * number column is the smallest thing that keeps them discoverable.
 */
const ActionMenu = ({ onEdit, onDelete }: ActionMenuProps) => (
  <Menu
    placement="bottom right"
    className="rounded-[10px] border border-ink/10 bg-surface-sunken p-1"
    trigger={({ ...triggerProps }) => (
      <TouchableOpacity {...triggerProps} hitSlop={8} className="h-9 w-6 items-center justify-center">
        <Icon as={EllipsisVertical} size="sm" className="text-content-tertiary" />
      </TouchableOpacity>
    )}
  >
    <MenuItem
      key="edit"
      textValue="Edit"
      onPress={onEdit}
      className="rounded-md p-3 data-[focus=true]:bg-surface-muted data-[active=true]:bg-surface-muted"
    >
      <Icon as={Settings2} size="sm" className="mr-2 text-content-body" />
      <MenuItemLabel size="sm">Edit</MenuItemLabel>
    </MenuItem>
    <MenuItem
      key="delete"
      textValue="Delete"
      onPress={onDelete}
      className="rounded-md p-3 data-[focus=true]:bg-surface-muted data-[active=true]:bg-surface-muted"
    >
      <Icon as={Trash2} size="sm" className="mr-2 text-status-danger" />
      <MenuItemLabel size="sm" className="text-status-danger">
        Delete
      </MenuItemLabel>
    </MenuItem>
  </Menu>
);

const DeleteAlert = ({ isOpen, onClose, onDelete }: { isOpen: boolean; onClose: () => void; onDelete: () => void }) => (
  <AlertDialog isOpen={isOpen} onClose={onClose}>
    <AlertDialogBackdrop onPress={onClose} />
    <AlertDialogContent className="max-w-md overflow-hidden rounded-[10px] border-0 bg-surface-muted">
      <AlertDialogHeader className="px-0">
        <Text className="font-serif text-lg text-content-primary">Delete Server</Text>
      </AlertDialogHeader>
      <AlertDialogBody className="px-0 py-4">
        <Text className="text-sm text-content-secondary">
          Are you sure you want to delete this server? This action cannot be undone.
        </Text>
      </AlertDialogBody>
      <AlertDialogFooter className="px-0">
        <HStack space="sm" className="py-0">
          <Button variant="outline" onPress={onClose} className="h-9 flex-1 rounded-md border border-ink/15 bg-transparent">
            <ButtonText className="text-sm text-content-body">Cancel</ButtonText>
          </Button>
          <Button variant="solid" onPress={onDelete} className="h-9 flex-1 rounded-md bg-status-danger active:opacity-80">
            <ButtonText className="text-sm text-white">Delete</ButtonText>
          </Button>
        </HStack>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

export const ServerCard = ({ id, index = 0, isFirst = false }: ServerCardProps) => {
  const editModalRef = useRef<EditServerModalRef>(null);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const removeServer = useServersStore((state) => state.removeServer);
  const server = useServersStore((state) => state.servers.find((s) => s.id === id));

  if (!server) return null;

  const { name, host, port, status, latency, cloud } = server;
  const isRefreshing = status === 'refreshing';
  const isOnline = status === 'online';

  const latencyText = isRefreshing || !isOnline || latency === undefined ? '—' : `${latency} ms`;
  // The word under the number states what the row is, not what it contains —
  // model counts live inside the server, and putting one here would break the
  // column into two different kinds of fact.
  const stateWord = isRefreshing ? 'Checking' : isOnline ? 'Ready' : 'Offline';

  return (
    <>
      <MotiView
        from={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ type: 'timing', duration: 200, delay: index * 40 }}
      >
        <TouchableOpacity
          onPress={() => router.push(`/workflow/${id}`)}
          activeOpacity={0.7}
          className={`flex-row items-center gap-3 px-4 py-3.5 ${isFirst ? '' : 'border-t border-ink/10'}`}
        >
          <StatusDot tone={isRefreshing ? 'busy' : isOnline ? 'ready' : 'offline'} pulse={isRefreshing} />

          <VStack className="min-w-0 flex-1" space="xs">
            <Text className="text-[15px] font-semibold text-content-primary" numberOfLines={1}>
              {name}
            </Text>
            <Text className="font-mono text-xs text-content-tertiary" numberOfLines={1}>
              {host}:{port}
            </Text>
            {/* Rented hardware bills whether or not anyone is watching, so the
                running total stays on the row. */}
            {cloud ? (
              <Text className="font-mono text-xs text-status-busy" numberOfLines={1}>
                {formatUptime(cloud.startedAt)} · {formatUsd(accruedCost(cloud.startedAt, cloud.pricePerHour))} ·{' '}
                {formatUsd(cloud.pricePerHour)}/hr
              </Text>
            ) : null}
          </VStack>

          {/* Numbers first, words second — the mono column is what makes a
              list of servers scannable. */}
          <VStack className="items-end" space="xs">
            <Text className="font-mono text-[13px] text-content-body">{latencyText}</Text>
            <Text className="text-xs text-content-tertiary" numberOfLines={1}>
              {stateWord}
            </Text>
          </VStack>

          <ActionMenu onEdit={() => editModalRef.current?.present()} onDelete={() => setIsDeleteAlertOpen(true)} />
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
