import { Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { useWorkflowStore } from '@/store/workflow';
import { Node } from '@/types/workflow';
import { uploadImage } from '@/utils/comfy-api-tools';
import { showToast } from '@/utils/toast';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Image as ImageIcon } from 'lucide-react-native';
import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BaseNode from '../../common/base-node';
import SubItem from '../../common/sub-item';

interface LoadImageNodeProps {
  node: Node;
  serverId: string;
  workflowId: string;
}

export default function LoadImage({ node, serverId, workflowId }: LoadImageNodeProps) {
  const updateNodeInput = useWorkflowStore((state) => state.updateNodeInput);
  const [isUploading, setIsUploading] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const safeAreaInsets = useSafeAreaInsets();

  const handleImageUpload = async () => {
    // Request permission first
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      showToast.error('Permission to access media library is required', undefined, safeAreaInsets.top + 8);
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 1,
    });
    if (result.assets?.[0]) {
      setIsUploading(true);
      try {
        const response = await uploadImage(result.assets[0].uri, result.assets[0].fileName ?? 'image.jpg', serverId);
        // Add a small delay to ensure the server has processed the image
        await new Promise((resolve) => setTimeout(resolve, 500));
        setImage(response.previewUrl);
        updateNodeInput(workflowId, node.id, 'image', response.name);
      } catch (error) {
        showToast.error('Error uploading image', undefined, safeAreaInsets.top + 8);
      } finally {
        setIsUploading(false);
      }
    }
  };

  return (
    <BaseNode node={node}>
      <SubItem title="image" node={node} dependencies={['image']}>
        <Pressable
          onPress={handleImageUpload}
          className="relative h-48 flex-1 items-center justify-center rounded-xl bg-background-50"
        >
          {image ? (
            <Image
              source={{ uri: image }}
              style={{
                width: '100%',
                height: '100%',
                borderRadius: 12,
              }}
              contentFit="contain"
              transition={200}
              cachePolicy="memory-disk"
            />
          ) : !isUploading ? (
            <VStack space="md" className="h-full w-full items-center justify-center">
              <Icon as={ImageIcon} className="h-8 w-8 text-typography-500" />
              <Text size="sm" className="text-typography-500">
                Upload Image
              </Text>
            </VStack>
          ) : null}
          {isUploading && (
            <VStack space="md" className="absolute inset-0 items-center justify-center rounded-xl bg-black/50">
              <Icon as={ImageIcon} className="h-8 w-8 text-typography-600" />
              <Text size="sm" className="text-typography-600">
                Uploading...
              </Text>
            </VStack>
          )}
        </Pressable>
      </SubItem>
    </BaseNode>
  );
}
