import { Sheet } from '@/components/ui/design-system/overlays';
import { Action, Copy, useDesign } from '@/components/ui/design-system/primitives';
import { View } from '@/components/ui/view';
import { ConfirmDialog } from '@/components/self-ui/confirm-dialog';
import { designTokens as t } from '@/constants/design-tokens';
import { useWorkflowStore } from '../stores/workflow-store';
import { serverWorkflowFilename } from '../utils/workflow-source';
import { showToast } from '@/utils/toast';
import { useState } from 'react';

export function WorkflowSourceSheet({ id, open, onClose }: { id: string; open: boolean; onClose: () => void }) {
  const record = useWorkflowStore((state) => state.workflow.find((item) => item.id === id));
  const [replacing, setReplacing] = useState(false);
  const c = useDesign();
  if (!record) return null;
  const missing = record.serverSync?.sourceMissing;
  const apply = (copy: boolean) => {
    useWorkflowStore.getState().applyServerUpdate(id, copy);
    setReplacing(false);
    onClose();
    showToast.success(
      'Workflow updated',
      copy ? 'Your local version was saved as an imported copy.' : 'The server version is now applied.',
    );
  };
  return (
    <>
      <Sheet open={open} onClose={onClose} title={missing ? 'Source removed' : 'Workflow update'} compactTitle>
        <View style={{ gap: t.layout.label }}>
          <Copy style={{ fontWeight: '500' }}>{record.name}</Copy>
          <Copy mono muted size="metadata">
            {serverWorkflowFilename(record)}
          </Copy>
        </View>
        <Copy muted size="label">
          {missing
            ? 'This file is no longer on the server. Your saved workflow and local changes are still available.'
            : 'The server has a newer version. Your local changes have been kept. Choose how to apply the update.'}
        </Copy>
        <View style={{ gap: t.layout.related }}>
          {missing ? (
            <Action
              kind="primary"
              onPress={() => {
                useWorkflowStore.getState().keepAsImported(id);
                onClose();
                showToast.success('Workflow kept', 'Saved as an imported workflow.');
              }}
            >
              Keep as imported
            </Action>
          ) : (
            <>
              <Action kind="primary" onPress={() => apply(true)}>
                Keep copy and update
              </Action>
              <Action kind="secondary" onPress={() => setReplacing(true)}>
                Replace local version
              </Action>
            </>
          )}
          <Copy muted size="metadata" style={{ color: c.muted }}>
            Generated results are kept.
          </Copy>
        </View>
      </Sheet>
      <ConfirmDialog
        isOpen={replacing}
        onClose={() => setReplacing(false)}
        onConfirm={() => apply(false)}
        title="Replace local changes?"
        description={`Apply the server version of “${record.name}”? Your current parameter changes will be replaced. Generated results are kept.`}
        confirmText="Replace local version"
        destructive
      />
    </>
  );
}
