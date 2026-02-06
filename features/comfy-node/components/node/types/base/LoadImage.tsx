import { Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { useServersStore } from '@/features/server/stores/server-store';
import { useWorkflowStore } from '@/features/workflow/stores/workflow-store';
import { Node } from '@/features/workflow/types';
import { uploadImage } from '@/services/comfy-api';
import { buildServerUrl } from '@/services/network';
import { showToast } from '@/utils/toast';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Image as ImageIcon, X } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
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
  const server = useServersStore((state) => state.servers.find((s) => s.id === serverId));
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [image, setImage] = useState<string | null>(null);
  const safeAreaInsets = useSafeAreaInsets();
  const cancelUploadRef = useRef<(() => Promise<void>) | null>(null);

  // Animated value for progress
  const progressWidth = useSharedValue(0);

  useEffect(() => {
    progressWidth.value = withTiming(uploadProgress * 100, { duration: 300 });
  }, [uploadProgress]);

  useEffect(() => {
    let isMounted = true;

    const syncPreviewFromNodeInput = async () => {
      const inputImage = node.inputs.image;
      if (!server || typeof inputImage !== 'string' || !inputImage) {
        if (isMounted) {
          setImage(null);
        }
        return;
      }

      const baseUrl = await buildServerUrl(server.useSSL, server.host, server.port, '/api/view');
      const params = new URLSearchParams();
      params.append('type', 'input');
      params.append('filename', inputImage);
      params.append('subfolder', '');
      params.append('rand', Math.random().toString());
      if (server.token) {
        params.append('token', server.token);
      }

      if (isMounted) {
        setImage(`${baseUrl}?${params.toString()}`);
      }
    };

    syncPreviewFromNodeInput();
    return () => {
      isMounted = false;
    };
  }, [server, node.inputs.image]);

  const animatedProgressStyle = useAnimatedStyle(() => {
    return {
      width: `${progressWidth.value}%`,
    };
  });

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
      setUploadProgress(0);
      progressWidth.value = 0;

      try {
        const { promise, cancel } = uploadImage(
          result.assets[0].uri,
          result.assets[0].fileName ?? 'image.jpg',
          serverId,
          result.assets[0].mimeType ?? undefined,
          (progress) => {
            setUploadProgress(progress);
          }
        );
        cancelUploadRef.current = cancel;

        const response = await promise;
        // Add a small delay to ensure the server has processed the image
        await new Promise((resolve) => setTimeout(resolve, 500));
        setImage(response.previewUrl);
        updateNodeInput(workflowId, node.id, 'image', response.name);
      } catch (error) {
        if (error instanceof Error && error.message.includes('canceled')) {
          // Upload canceled, do nothing
        } else {
          showToast.error('Error uploading image', undefined, safeAreaInsets.top + 8);
        }
      } finally {
        setIsUploading(false);
        setUploadProgress(0);
        cancelUploadRef.current = null;
      }
    }
  };

  const handleCancelUpload = async () => {
    if (cancelUploadRef.current) {
      await cancelUploadRef.current();
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleClearImage = () => {
    setImage(null);
    updateNodeInput(workflowId, node.id, 'image', undefined);
  };

  return (
    <BaseNode node={node}>
      <SubItem title="image">
        <Pressable
          onPress={isUploading ? undefined : handleImageUpload}
          className="relative h-48 flex-1 items-center justify-center rounded-xl bg-background-50"
        >
          {image ? (
            <>
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
              <Pressable
                onPress={handleClearImage}
                className="absolute right-2 top-2 rounded-full bg-black/35 p-1.5 active:bg-black/45"
              >
                <Icon as={X} className="h-4 w-4 text-white" />
              </Pressable>
            </>
          ) : !isUploading ? (
            <VStack space="md" className="h-full w-full items-center justify-center">
              <Icon as={ImageIcon} className="h-8 w-8 text-typography-500" />
              <Text size="sm" className="text-typography-500">
                Upload Image
              </Text>
            </VStack>
          ) : null}
          {isUploading && (
            <VStack space="sm" className="absolute inset-0 items-center justify-center rounded-xl bg-black/50 p-4">
              <Icon as={ImageIcon} className="h-8 w-8 text-typography-600 mb-2" />
              <Text size="sm" className="text-typography-600 font-medium">
                Uploading... {Math.round(uploadProgress * 100)}%
              </Text>
              <View className="h-1 w-full bg-white/30 rounded-full overflow-hidden">
                <Animated.View
                  className="h-full bg-primary-500 rounded-full"
                  style={animatedProgressStyle}
                />
              </View>
              <Pressable
                onPress={handleCancelUpload}
                className="mt-2 rounded-full bg-white/20 p-2 active:bg-white/30"
              >
                <Icon as={X} className="h-5 w-5 text-white" />
              </Pressable>
            </VStack>
          )}
        </Pressable>
      </SubItem>
    </BaseNode>
  );
}
