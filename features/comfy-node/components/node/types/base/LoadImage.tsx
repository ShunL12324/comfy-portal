import { ThemedBottomSheetModal } from '@/components/self-ui/themed-bottom-sheet-modal';
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
import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import * as DocumentPicker from 'expo-document-picker';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useQuickActionStore } from '@/features/quick-action/stores/quick-action-store';
import { Camera, Folder, Image as ImageIcon, Share, X } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BaseNode from '../../common/base-node';
import SubItem from '../../common/sub-item';

interface LoadImageNodeProps {
  node: Node;
  serverId: string;
  workflowId: string;
  sharedImageUri?: string;
}

interface UploadAssetCandidate {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
}

type PendingSourcePickerAction = 'library' | 'files' | 'camera' | null;

export default function LoadImage({ node, serverId, workflowId, sharedImageUri }: LoadImageNodeProps) {
  const updateNodeInput = useWorkflowStore((state) => state.updateNodeInput);
  const server = useServersStore((state) => state.servers.find((s) => s.id === serverId));
  const addQuickAction = useQuickActionStore((state) => state.addAction);
  const removeQuickAction = useQuickActionStore((state) => state.removeAction);
  const hasQuickAction = useQuickActionStore((state) =>
    state.actions.some(
      (a) => a.serverId === serverId && a.workflowId === workflowId && a.targetNodeId === node.id,
    ),
  );
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [image, setImage] = useState<string | null>(null);
  const safeAreaInsets = useSafeAreaInsets();
  const cancelUploadRef = useRef<(() => Promise<void>) | null>(null);
  const sourcePickerModalRef = useRef<BottomSheetModal>(null);
  const pendingSourcePickerActionRef = useRef<PendingSourcePickerAction>(null);

  // Animated value for progress
  const progressWidth = useSharedValue(0);

  useEffect(() => {
    progressWidth.value = withTiming(uploadProgress * 100, { duration: 300 });
  }, [uploadProgress, progressWidth]);

  useEffect(() => {
    if (isUploading) {
      pendingSourcePickerActionRef.current = null;
      sourcePickerModalRef.current?.dismiss();
    }
  }, [isUploading]);

  // Auto-upload shared image from Share Extension
  const sharedImageHandled = useRef(false);
  useEffect(() => {
    if (!sharedImageUri || sharedImageHandled.current || isUploading) return;
    sharedImageHandled.current = true;

    const fileName = sharedImageUri.split('/').pop() || 'shared_image.jpg';
    uploadPickedAsset({
      uri: sharedImageUri,
      fileName,
      mimeType: null,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sharedImageUri, isUploading]);

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

      const baseUrl = await buildServerUrl(server.useSSL, server.host, server.port, '/view');
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

  const uploadPickedAsset = async (asset: UploadAssetCandidate) => {
    setIsUploading(true);
    setUploadProgress(0);
    progressWidth.value = 0;

    try {
      const { promise, cancel } = uploadImage(
        asset.uri,
        asset.fileName ?? 'image.jpg',
        serverId,
        asset.mimeType ?? undefined,
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
        showToast.error('Error uploading image', error instanceof Error ? error.message : undefined, safeAreaInsets.top + 8);
      }
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      cancelUploadRef.current = null;
    }
  };

  const handlePickFromLibrary = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      showToast.error('Permission to access media library is required', undefined, safeAreaInsets.top + 8);
      return;
    }

    let result: ImagePicker.ImagePickerResult;
    try {
      // Wrap with timeout — expo-image-picker can hang on iPad for certain photos
      const pickerPromise = ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 1,
        shouldDownloadFromNetwork: true,
      });
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('PICKER_TIMEOUT')), 30000),
      );
      result = await Promise.race([pickerPromise, timeoutPromise]);
    } catch (pickerError) {
      if (pickerError instanceof Error && pickerError.message === 'PICKER_TIMEOUT') {
        showToast.error(
          'Photo Library timed out',
          'Try using "Files" instead',
          safeAreaInsets.top + 8,
        );
      } else {
        showToast.error('Failed to pick image', pickerError instanceof Error ? pickerError.message : undefined, safeAreaInsets.top + 8);
      }
      return;
    }
    if (result.canceled || !result.assets?.[0]) {
      return;
    }

    await uploadPickedAsset({
      uri: result.assets[0].uri,
      fileName: result.assets[0].fileName,
      mimeType: result.assets[0].mimeType,
    });
  };

  const handlePickFromFiles = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['image/*'],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.canceled || !result.assets?.[0]) {
      return;
    }

    await uploadPickedAsset({
      uri: result.assets[0].uri,
      fileName: result.assets[0].name,
      mimeType: result.assets[0].mimeType,
    });
  };

  const handlePickFromCamera = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      showToast.error('Permission to access camera is required', undefined, safeAreaInsets.top + 8);
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 1,
      cameraType: ImagePicker.CameraType.back,
    });
    if (result.canceled || !result.assets?.[0]) {
      return;
    }

    await uploadPickedAsset({
      uri: result.assets[0].uri,
      fileName: result.assets[0].fileName,
      mimeType: result.assets[0].mimeType,
    });
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
    updateNodeInput(workflowId, node.id, 'image', '');
  };

  const handleOpenSourcePicker = () => {
    if (isUploading) return;
    sourcePickerModalRef.current?.present();
  };

  const handleCloseSourcePicker = () => {
    sourcePickerModalRef.current?.dismiss();
  };

  const handleSelectSourcePickerAction = (action: Exclude<PendingSourcePickerAction, null>) => {
    pendingSourcePickerActionRef.current = action;
    handleCloseSourcePicker();
  };

  const handleSourcePickerDismiss = () => {
    if (isUploading) {
      pendingSourcePickerActionRef.current = null;
      return;
    }

    const action = pendingSourcePickerActionRef.current;
    pendingSourcePickerActionRef.current = null;

    if (action === 'library') {
      void handlePickFromLibrary();
      return;
    }

    if (action === 'files') {
      void handlePickFromFiles();
      return;
    }

    if (action === 'camera') {
      void handlePickFromCamera();
    }
  };

  const handleToggleQuickAction = useCallback(() => {
    if (hasQuickAction) {
      // Remove existing quick actions for this node
      const existing = useQuickActionStore.getState().actions.filter(
        (a) => a.serverId === serverId && a.workflowId === workflowId && a.targetNodeId === node.id,
      );
      existing.forEach((a) => { removeQuickAction(a.id); });
      showToast.success('Quick Action removed', undefined, safeAreaInsets.top + 8);
    } else {
      const workflow = useWorkflowStore.getState().workflow.find((w) => w.id === workflowId);
      const name = workflow?.name
        ? `${workflow.name} - ${node._meta?.title || 'Image'}`
        : node._meta?.title || 'Load Image';
      addQuickAction({
        name,
        serverId,
        workflowId,
        targetNodeId: node.id,
      });
      showToast.success('Quick Action enabled', 'Share images from Photos to this node', safeAreaInsets.top + 8);
    }
  }, [hasQuickAction, removeQuickAction, addQuickAction, serverId, workflowId, node.id, node._meta?.title, safeAreaInsets.top]);

  return (
    <BaseNode
      node={node}
      badges={
        <Pressable
          onPress={handleToggleQuickAction}
          className={`flex-row items-center gap-1.5 rounded-lg px-2.5 py-1.5 ${
            hasQuickAction
              ? 'bg-primary-500 active:bg-primary-600'
              : 'bg-background-50 active:bg-background-100'
          }`}
        >
          <Icon
            as={Share}
            className={`h-3.5 w-3.5 ${hasQuickAction ? 'text-typography-0' : 'text-typography-400'}`}
          />
          <Text
            className={`text-xs font-medium ${hasQuickAction ? 'text-typography-0' : 'text-typography-400'}`}
          >
            Quick Action
          </Text>
        </Pressable>
      }
    >
      <SubItem title="image">
        <Pressable
          onPress={handleOpenSourcePicker}
          className="relative h-48 w-full items-center justify-center rounded-xl bg-background-50"
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
                onPress={(event) => {
                  event.stopPropagation();
                  handleClearImage();
                }}
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
                onPress={(event) => {
                  event.stopPropagation();
                  void handleCancelUpload();
                }}
                className="mt-2 rounded-full bg-white/20 p-2 active:bg-white/30"
              >
                <Icon as={X} className="h-5 w-5 text-white" />
              </Pressable>
            </VStack>
          )}
        </Pressable>

        <ThemedBottomSheetModal
          ref={sourcePickerModalRef}
          index={0}
          snapPoints={['34%']}
          topInset={safeAreaInsets.top}
          enablePanDownToClose
          onDismiss={handleSourcePickerDismiss}
        >
          <BottomSheetView style={{ paddingHorizontal: 16, paddingBottom: safeAreaInsets.bottom + 16 }}>
            <VStack space="sm">
              <Text className="mb-1 text-sm font-semibold text-typography-900">Upload Image</Text>

              <Pressable
                onPress={() => {
                  handleSelectSourcePickerAction('library');
                }}
                className="flex-row items-center gap-3 rounded-xl bg-background-50 px-4 py-3"
              >
                <Icon as={ImageIcon} className="h-4 w-4 text-typography-700" />
                <Text className="text-sm text-typography-900">Photo Library</Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  handleSelectSourcePickerAction('files');
                }}
                className="flex-row items-center gap-3 rounded-xl bg-background-50 px-4 py-3"
              >
                <Icon as={Folder} className="h-4 w-4 text-typography-700" />
                <Text className="text-sm text-typography-900">Files</Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  handleSelectSourcePickerAction('camera');
                }}
                className="flex-row items-center gap-3 rounded-xl bg-background-50 px-4 py-3"
              >
                <Icon as={Camera} className="h-4 w-4 text-typography-700" />
                <Text className="text-sm text-typography-900">Camera</Text>
              </Pressable>
            </VStack>
          </BottomSheetView>
        </ThemedBottomSheetModal>
      </SubItem>
    </BaseNode>
  );
}
