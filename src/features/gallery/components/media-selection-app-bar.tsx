import { AppBar } from '@/components/layout/app-bar';
import { ConfirmDialog } from '@/components/self-ui/confirm-dialog';
import { Action, Row } from '@/components/ui/design-system/primitives';
import { CheckSquare, Download, Share, Square, Trash2, type LucideIcon } from '@/constants/icons';
import * as MediaLibrary from '@/services/media-library';
import { showToast } from '@/utils/toast';
import * as Sharing from 'expo-sharing';
import { useState, type ComponentProps, type ReactNode } from 'react';
import { Platform } from 'react-native';

import type { MediaSelection } from '../hooks/use-media-selection';
import { batchSaveSummary, getBatchActions, type BatchAction } from '../utils/media-selection';
import { ensureSavePermission, useCanShare } from './media-viewer/use-media-viewer-actions';

const ACTION_META: Record<BatchAction, { icon: LucideIcon; label: string }> = {
  save: { icon: Download, label: Platform.OS === 'web' ? 'Download selected' : 'Save selected to Photos' },
  share: { icon: Share, label: 'Share selected' },
  delete: { icon: Trash2, label: 'Delete selected' },
};

interface MediaSelectionAppBarProps extends Pick<ComponentProps<typeof AppBar>, 'title' | 'titleSize'> {
  selection: MediaSelection;
  /** Trailing content outside selection mode. */
  idleRightElement?: ReactNode;
  /** Deletes the media at these URIs, removing them from the grid. */
  onDelete: (uris: string[]) => Promise<void>;
}

/**
 * The grid's app bar, which becomes the selection bar while selecting: "N
 * selected" as the title and, top-right in the same order as the viewer's bar,
 * Select all, Save, Share and Delete, then Cancel. Delete asks once for the
 * whole selection; Save reports one summary; Share takes a single item.
 */
export function MediaSelectionAppBar({
  title,
  titleSize,
  selection,
  idleRightElement,
  onDelete,
}: MediaSelectionAppBarProps) {
  const canShare = useCanShare();
  const [busy, setBusy] = useState<BatchAction | null>(null);
  // Held while the confirmation is up, so its wording survives the grid emptying under it.
  const [confirming, setConfirming] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState<string>();
  const count = selection.selected.length;

  const save = async () => {
    const uris = [...selection.selected];
    setBusy('save');
    try {
      if (!(await ensureSavePermission())) return;
      let saved = 0;
      for (const uri of uris) {
        try {
          await MediaLibrary.saveToLibraryAsync(uri);
          saved += 1;
        } catch (error) {
          console.error('Failed to save media:', error);
        }
      }
      const summary = batchSaveSummary({ saved, total: uris.length, web: Platform.OS === 'web' });
      if (saved === uris.length) {
        showToast.success(summary);
        selection.end();
      } else showToast.error(summary);
    } finally {
      setBusy(null);
    }
  };

  const share = async () => {
    if (count !== 1) return;
    setBusy('share');
    try {
      await Sharing.shareAsync(selection.selected[0]);
    } catch (error) {
      // Dismissing the share sheet rejects on some platforms; that is not a failure.
      console.warn('Share did not complete:', error);
    } finally {
      setBusy(null);
    }
  };

  const confirmDelete = async () => {
    setBusy('delete');
    try {
      await onDelete([...selection.selected]);
      setConfirming(null);
      selection.end();
    } catch (error) {
      console.error('Failed to delete media:', error);
      setDeleteError('Some items could not be deleted. Try again.');
    } finally {
      setBusy(null);
    }
  };

  const run = (action: BatchAction) => {
    if (action === 'save') void save();
    else if (action === 'share') void share();
    else {
      setDeleteError(undefined);
      setConfirming(count);
    }
  };

  const rightElement = selection.active ? (
    <Row>
      <Action
        icon={selection.allSelected ? Square : CheckSquare}
        label={selection.allSelected ? 'Deselect all' : 'Select all'}
        disabled={busy !== null}
        onPress={selection.toggleAll}
      />
      {getBatchActions({ count, canShare }).map(({ action, enabled }) => (
        <Action
          key={action}
          icon={ACTION_META[action].icon}
          label={ACTION_META[action].label}
          destructive={action === 'delete'}
          loading={busy === action && action !== 'delete'}
          disabled={!enabled || (busy !== null && busy !== action)}
          onPress={() => run(action)}
        />
      ))}
      <Action small onPress={selection.end} disabled={busy === 'save'}>
        Cancel
      </Action>
    </Row>
  ) : (
    idleRightElement
  );

  return (
    <>
      <AppBar
        title={selection.active ? `${count} selected` : title}
        titleSize={titleSize}
        rightElement={rightElement}
      />
      <ConfirmDialog
        isOpen={confirming !== null}
        destructive
        loading={busy === 'delete'}
        error={deleteError}
        onClose={() => setConfirming(null)}
        onConfirm={confirmDelete}
        title={confirming === 1 ? 'Delete 1 item?' : `Delete ${confirming ?? 0} items?`}
        description={`${confirming === 1 ? 'It is' : 'They are'} removed from Comfy Portal. This cannot be undone.`}
        confirmText="Delete"
      />
    </>
  );
}
