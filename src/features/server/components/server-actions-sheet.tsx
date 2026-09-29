import { Sheet } from '@/components/ui/design-system/overlays';
import { SettingRow } from '@/components/self-ui/setting-row';
import { Clipboard, Settings2, Trash2 } from '@/constants/icons';
import { showToast } from '@/utils/toast';
import * as ExpoClipboard from 'expo-clipboard';
import { useRef } from 'react';

export type ServerAction = 'edit' | 'remove' | 'destroy';

/**
 * What can be done to a saved connection, reachable from its card in the
 * Servers list. The follow-up (another sheet or a confirmation) runs only once
 * this sheet has finished dismissing, so two overlays never fight over the screen.
 */
export function ServerActionsSheet({
  open,
  onClose,
  name,
  address,
  rented,
  onAction,
}: {
  open: boolean;
  onClose: () => void;
  name: string;
  address: string;
  /** A rented instance can be destroyed as well as forgotten. */
  rented: boolean;
  onAction: (action: ServerAction) => void;
}) {
  const next = useRef<ServerAction | null>(null);
  const choose = (action: ServerAction) => {
    next.current = action;
    onClose();
  };
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={name}
      compactTitle
      onDismiss={() => {
        const action = next.current;
        next.current = null;
        if (action) onAction(action);
      }}
    >
      <SettingRow icon={Settings2} label="Edit connection" right={<></>} onPress={() => choose('edit')} />
      <SettingRow
        icon={Clipboard}
        label="Copy address"
        right={<></>}
        onPress={async () => {
          await ExpoClipboard.setStringAsync(address);
          showToast.success('Address copied', address);
          onClose();
        }}
      />
      <SettingRow icon={Trash2} label="Remove connection" right={<></>} destructive onPress={() => choose('remove')} />
      {rented && (
        <SettingRow
          icon={Trash2}
          label="Destroy instance"
          right={<></>}
          destructive
          onPress={() => choose('destroy')}
        />
      )}
    </Sheet>
  );
}
