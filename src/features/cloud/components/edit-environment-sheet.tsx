import { useState } from 'react';
import { ConfirmDialog } from '@/components/self-ui/confirm-dialog';
import { Sheet } from '@/components/ui/design-system/overlays';
import { Action, ActionRow, Field } from '@/components/ui/design-system/primitives';
import { AlertTriangle } from '@/constants/icons';
import { useEnvironmentStore } from '@/features/cloud/stores/environment-store';
import { showToast } from '@/utils/toast';

/**
 * Edit environment: name and description, then Delete environment. Opened
 * from the environment page's settings action and by long-pressing its card,
 * like the Connection sheet for servers.
 */
export function EditEnvironmentSheet({
  environmentId,
  open,
  onClose,
  onDeleted,
}: {
  environmentId: string | undefined;
  open: boolean;
  onClose: () => void;
  /** Runs before the recipe is removed, so a page showing it can leave first. */
  onDeleted?: () => void;
}) {
  return open && environmentId ? (
    <EditEnvironmentForm environmentId={environmentId} onClose={onClose} onDeleted={onDeleted} />
  ) : null;
}

function EditEnvironmentForm({
  environmentId,
  onClose,
  onDeleted,
}: {
  environmentId: string;
  onClose: () => void;
  onDeleted?: () => void;
}) {
  // Mounted per opening, so each one starts from the saved name and description.
  const saved = useEnvironmentStore.getState().environments.find((item) => item.id === environmentId);
  const [name, setName] = useState(saved?.name ?? '');
  const [description, setDescription] = useState(saved?.description ?? '');
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  return (
    <>
      <Sheet open onClose={onClose} title="Edit environment">
        <Field label="Name" value={name} onChange={setName} placeholder="Environment name" />
        <Field label="Description" multiline value={description} onChange={setDescription} placeholder="Description" />
        <ActionRow>
          <Action kind="secondary" fill onPress={onClose}>
            Cancel
          </Action>
          <Action
            kind="primary"
            fill
            disabled={!name.trim()}
            onPress={() => {
              useEnvironmentStore
                .getState()
                .updateEnvironment(environmentId, { name: name.trim(), description: description.trim() });
              onClose();
            }}
          >
            Save changes
          </Action>
        </ActionRow>
        <Action kind="primary" destructive fill icon={AlertTriangle} onPress={() => setConfirmingDelete(true)}>
          Delete environment
        </Action>
      </Sheet>
      <ConfirmDialog
        isOpen={confirmingDelete}
        destructive
        title="Delete environment?"
        description="Delete this recipe and its model, extension and workflow lists from the app. Servers already built from it keep running with their own copy; nothing is destroyed or billed."
        confirmText="Delete environment"
        onClose={() => setConfirmingDelete(false)}
        onConfirm={() => {
          setConfirmingDelete(false);
          onClose();
          onDeleted?.();
          useEnvironmentStore.getState().removeEnvironment(environmentId);
          showToast.success('Environment deleted');
        }}
      />
    </>
  );
}
