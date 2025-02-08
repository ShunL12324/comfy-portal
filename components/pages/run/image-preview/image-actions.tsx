import {
  Actionsheet,
  ActionsheetBackdrop,
  ActionsheetContent,
  ActionsheetDragIndicator,
  ActionsheetDragIndicatorWrapper,
  ActionsheetItem,
  ActionsheetItemText,
} from '@/components/ui/actionsheet';
import { Icon } from '@/components/ui/icon';
import { useWorkflowStore } from '@/store/workflow';
import { saveWorkflowThumbnail } from '@/utils/image-storage';
import { showToast } from '@/utils/toast';
import * as MediaLibrary from 'expo-media-library';
import { ImageIcon, Save } from 'lucide-react-native';
import { memo } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ImageActionsProps {
  /** Whether the action sheet is open */
  isOpen: boolean;
  /** Callback when the action sheet is closed */
  onClose: () => void;
  /** URL of the image */
  imageUrl?: string;
  /** Current preset ID */
  workflowId?: string;
  /** Current server ID */
  serverId?: string;
}

/**
 * Component for image actions (save to gallery, set as thumbnail)
 */
export const ImageActions = memo(function ImageActions({
  isOpen,
  onClose,
  imageUrl,
  workflowId,
  serverId,
}: ImageActionsProps) {
  const [permissionResponse, requestPermission] = MediaLibrary.usePermissions();
  const safeAreaInsets = useSafeAreaInsets();

  const handleSaveToGallery = async () => {
    try {
      if (!permissionResponse?.granted) {
        const { granted } = await requestPermission();
        if (!granted) {
          return;
        }
      }

      if (imageUrl) {
        await MediaLibrary.saveToLibraryAsync(imageUrl);
        onClose();
        showToast.success('Image saved to your gallery', undefined, safeAreaInsets.top + 16);
      }
    } catch (error) {
      console.error('Failed to save image:', error);
      showToast.error('Failed to save image', undefined, safeAreaInsets.top + 16);
    }
  };

  const handleSetAsThumbnail = async () => {
    if (!imageUrl || !workflowId || !serverId) return;

    try {
      const savedImage = await saveWorkflowThumbnail({
        serverId,
        workflowId,
        imageUri: imageUrl,
      });

      if (savedImage) {
        const localImageUri = savedImage.path.startsWith('file://') ? savedImage.path : `file://${savedImage.path}`;

        useWorkflowStore.getState().updateWorkflow(workflowId, {
          thumbnail: localImageUri,
        });

        showToast.success('Thumbnail updated', undefined, safeAreaInsets.top + 16);
      }
    } catch (error) {
      console.error('Failed to set thumbnail:', error);
      showToast.error('Failed to set thumbnail', undefined, safeAreaInsets.top + 16);
    }
    onClose();
  };

  return (
    <Actionsheet isOpen={isOpen} onClose={onClose}>
      <ActionsheetBackdrop />
      <ActionsheetContent className="bg-background-0">
        <ActionsheetDragIndicatorWrapper>
          <ActionsheetDragIndicator />
        </ActionsheetDragIndicatorWrapper>
        <ActionsheetItem onPress={handleSaveToGallery} className="flex-row items-center gap-3">
          <Icon as={Save} size="sm" />
          <ActionsheetItemText>Save Image</ActionsheetItemText>
        </ActionsheetItem>
        {workflowId && (
          <ActionsheetItem onPress={handleSetAsThumbnail} className="mb-8 flex-row items-center gap-3">
            <Icon as={ImageIcon} size="sm" />
            <ActionsheetItemText>Set as Preset Thumbnail</ActionsheetItemText>
          </ActionsheetItem>
        )}
      </ActionsheetContent>
    </Actionsheet>
  );
});
