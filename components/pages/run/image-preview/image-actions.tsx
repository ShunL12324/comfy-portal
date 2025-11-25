import { BottomActionPanel } from '@/components/self-ui/bottom-action-panel';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { useWorkflowStore } from '@/store/workflow';
import { saveWorkflowThumbnail } from '@/utils/image-storage';
import { showToast } from '@/utils/toast';
import * as MediaLibrary from 'expo-media-library';
import { ImageIcon, Save } from 'lucide-react-native';
import { memo } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ImageActionsProps {
  /** Whether the action sheet is open */
  isOpen: boolean;
  /** Callback when the action sheet is closed */
  onClose: () => void;
  /** URL of the image */
  imageUrl?: string;
  /** Current workflow ID */
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
    <>
      {isOpen && (
        <Pressable className="absolute inset-0 z-40 bg-black/30" onPress={onClose} />
      )}
      <View className="absolute bottom-0 left-0 right-0 z-50">
        <BottomActionPanel isOpen={isOpen}>
          <VStack space="sm">
            <Button
              variant="outline"
              size="lg"
              onPress={handleSaveToGallery}
              className="h-12 w-full justify-start border-background-100 px-4"
            >
              <Icon as={Save} size="sm" className="mr-2 text-primary-500" />
              <Text className="text-sm text-primary-500">Save Image</Text>
            </Button>
            {workflowId && (
              <Button
                variant="outline"
                size="lg"
                onPress={handleSetAsThumbnail}
                className="h-12 w-full justify-start border-background-100 px-4"
              >
                <Icon as={ImageIcon} size="sm" className="mr-2 text-primary-500" />
                <Text className="text-sm text-primary-500">Set as Workflow Thumbnail</Text>
              </Button>
            )}
          </VStack>
        </BottomActionPanel>
      </View>
    </>
  );
});
