import { BottomActionPanel } from '@/components/self-ui/bottom-action-panel';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Copy, useDesign } from '@/components/ui/design-system/primitives';
import { VStack } from '@/components/ui/vstack';
import { useWorkflowStore } from '@/features/workflow/stores/workflow-store';
import { saveWorkflowThumbnail } from '@/services/image-storage';
import { showToast } from '@/utils/toast';
import * as MediaLibrary from '@/services/media-library';
import { ImageIcon, Save } from '@/constants/icons';
import { memo } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface MediaActionsProps {
  /** Whether the action sheet is open */
  isOpen: boolean;
  /** Callback when the action sheet is closed */
  onClose: () => void;
  /** URL of the media */
  mediaUrl?: string;
  /** Current workflow ID */
  workflowId?: string;
  /** Current server ID */
  serverId?: string;
}

/**
 * Component for media actions (save to gallery, set as thumbnail)
 */
export const MediaActions = memo(function MediaActions({
  isOpen,
  onClose,
  mediaUrl,
  workflowId,
  serverId,
}: MediaActionsProps) {
  const [permissionResponse, requestPermission] = MediaLibrary.usePermissions();
  const c = useDesign();
  const safeAreaInsets = useSafeAreaInsets();

  const handleSaveToGallery = async () => {
    try {
      if (!permissionResponse?.granted) {
        const { granted } = await requestPermission();
        if (!granted) {
          showToast.error('Permission needed', 'Please grant permission to save media.');
          return;
        }
      }

      if (mediaUrl) {
        await MediaLibrary.saveToLibraryAsync(mediaUrl);
        onClose();
        showToast.success('Media saved to your gallery', undefined);
      }
    } catch (error) {
      console.error('Failed to save media:', error);
      showToast.error('Failed to save media', undefined);
    }
  };

  const handleSetAsThumbnail = async () => {
    if (!mediaUrl || !workflowId || !serverId) return;

    try {
      const savedImage = await saveWorkflowThumbnail({
        serverId,
        workflowId,
        imageUri: mediaUrl,
      });

      if (savedImage) {
        const localImageUri = savedImage.path.startsWith('file://') ? savedImage.path : `file://${savedImage.path}`;

        useWorkflowStore.getState().updateWorkflow(workflowId, {
          thumbnail: localImageUri,
        });

        showToast.success('Thumbnail updated', undefined);
      }
    } catch (error) {
      console.error('Failed to set thumbnail:', error);
      showToast.error('Failed to set thumbnail', undefined);
    }
    onClose();
  };

  return (
    <>
      {isOpen && <Pressable className="inset-0 bg-media/20 absolute z-40" onPress={onClose} />}
      <View className="bottom-0 left-0 right-0 absolute z-50">
        <BottomActionPanel isOpen={isOpen}>
          <VStack space="sm">
            <Button
              variant="outline"
              size="lg"
              onPress={handleSaveToGallery}
              className="h-12 border-stroke-subtle px-4 w-full justify-start"
            >
              <Icon as={Save} size="sm" className="mr-2 text-action" />
              <Copy size="label" style={{ color: c.tint }}>
                Save Media
              </Copy>
            </Button>
            {workflowId && (
              <Button
                variant="outline"
                size="lg"
                onPress={handleSetAsThumbnail}
                className="h-12 border-stroke-subtle px-4 w-full justify-start"
              >
                <Icon as={ImageIcon} size="sm" className="mr-2 text-action" />
                <Copy size="label" style={{ color: c.tint }}>
                  Set as Workflow Thumbnail
                </Copy>
              </Button>
            )}
          </VStack>
        </BottomActionPanel>
      </View>
    </>
  );
});
