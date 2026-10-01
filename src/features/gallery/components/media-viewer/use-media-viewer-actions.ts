import { useWorkflowStore } from '@/features/workflow/stores/workflow-store';
import { saveWorkflowThumbnail } from '@/services/image-storage';
import * as MediaLibrary from '@/services/media-library';
import { showToast } from '@/utils/toast';
import * as Sharing from 'expo-sharing';
import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';

import type { MediaViewerItem } from './media-viewer-utils';

type Busy = 'save' | 'share' | 'thumbnail' | null;

/** Whether a share sheet exists here. Web only shares where the browser has one. */
export function useCanShare() {
  const [canShare, setCanShare] = useState(false);
  useEffect(() => {
    let active = true;
    Sharing.isAvailableAsync()
      .then((available) => active && setCanShare(available))
      .catch(() => active && setCanShare(false));
    return () => {
      active = false;
    };
  }, []);
  return canShare;
}

/** Asks for Photos access, explaining a refusal in a toast; true when saving may go ahead. */
export async function ensureSavePermission(): Promise<boolean> {
  const permission = await MediaLibrary.requestPermissionsAsync();
  if (permission.granted) return true;
  showToast.error(
    'Photos access needed',
    permission.canAskAgain
      ? 'Allow access to save media to your library.'
      : 'Turn on Photos access for Comfy Portal in Settings.',
  );
  return false;
}

/**
 * Save, share and set-as-thumbnail for the item on screen. Saving goes through
 * `@/services/media-library`, whose web build turns it into a browser download,
 * so only the wording differs per platform.
 */
export function useMediaViewerActions({ workflowId, serverId }: { workflowId?: string; serverId?: string }) {
  const canShare = useCanShare();
  const [busy, setBusy] = useState<Busy>(null);

  const save = useCallback(async (item: MediaViewerItem) => {
    setBusy('save');
    try {
      if (!(await ensureSavePermission())) return;
      await MediaLibrary.saveToLibraryAsync(item.uri);
      showToast.success(Platform.OS === 'web' ? 'Download started' : 'Saved to Photos');
    } catch (error) {
      console.error('Failed to save media:', error);
      showToast.error(Platform.OS === 'web' ? 'Download failed' : 'Could not save to Photos');
    } finally {
      setBusy(null);
    }
  }, []);

  const share = useCallback(async (item: MediaViewerItem) => {
    setBusy('share');
    try {
      await Sharing.shareAsync(item.uri);
    } catch (error) {
      // Dismissing the share sheet rejects on some platforms; that is not a failure.
      console.warn('Share did not complete:', error);
    } finally {
      setBusy(null);
    }
  }, []);

  const canSetThumbnail = !!workflowId && !!serverId;
  const setThumbnail = useCallback(
    async (item: MediaViewerItem) => {
      if (!workflowId || !serverId) return;
      setBusy('thumbnail');
      try {
        const savedImage = await saveWorkflowThumbnail({ serverId, workflowId, imageUri: item.uri });
        if (savedImage) {
          const localImageUri = savedImage.path.startsWith('file://') ? savedImage.path : `file://${savedImage.path}`;
          useWorkflowStore.getState().updateWorkflow(workflowId, { thumbnail: localImageUri });
          showToast.success('Thumbnail updated');
        }
      } catch (error) {
        console.error('Failed to set thumbnail:', error);
        showToast.error('Failed to set thumbnail');
      } finally {
        setBusy(null);
      }
    },
    [serverId, workflowId],
  );

  return { canShare, canSetThumbnail, busy, save, share, setThumbnail };
}
