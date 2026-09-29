import { BottomActionPanel } from '@/components/self-ui/bottom-action-panel';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Copy, useDesign } from '@/components/ui/design-system/primitives';
import { VStack } from '@/components/ui/vstack';
import { useWorkflowStore } from '@/features/workflow/stores/workflow-store';
import { saveWorkflowThumbnail } from '@/services/image-storage';
import { showToast } from '@/utils/toast';
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
 * Web version: uses browser download API instead of expo-media-library
 */
export const MediaActions = memo(function MediaActions({
  isOpen,
  onClose,
  mediaUrl,
  workflowId,
  serverId,
}: MediaActionsProps) {
  const c = useDesign();
  const safeAreaInsets = useSafeAreaInsets();

  const handleSaveToGallery = async () => {
    try {
      if (!mediaUrl) return;

      // On web, trigger a browser download
      const response = await fetch(mediaUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      const filename = mediaUrl.split('/').pop()?.split('?')[0] || 'download';
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);

      onClose();
      showToast.success('Media download started', undefined);
    } catch (error) {
      console.error('Failed to download media:', error);
      showToast.error('Failed to download media', undefined);
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
