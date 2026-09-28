import { ThemedBottomSheetModal } from '@/components/self-ui/themed-bottom-sheet-modal';
import { Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { Title, Copy, StateIcon, useDesign } from '@/components/ui/design-system/primitives';
import { VStack } from '@/components/ui/vstack';
import { useServersStore } from '@/features/server/stores/server-store';
import { useWorkflowStore } from '@/features/workflow/stores/workflow-store';
import { Node } from '@/features/workflow/types';
import { uploadImage } from '@/services/comfy-api';
import { buildServerUrl } from '@/services/network';
import { clearNodeSchemaCache } from '@/services/node-schema';
import { useNodeSchema } from '@/hooks/useNodeSchema';
import { showToast } from '@/utils/toast';
import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import * as DocumentPicker from 'expo-document-picker';
import { Image } from 'expo-image';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useQuickActionStore } from '@/features/quick-action/stores/quick-action-store';
import { AlertTriangle, Camera, Folder, HardDrive, Image as ImageIcon, Share, X } from '@/constants/icons';
import { useCallback, useEffect, useEffectEvent, useRef, useState } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BaseNode from '../../common/base-node';
import { ServerImagePicker } from '../../common/server-image-picker';
import SubItem from '../../common/sub-item';
import { designTokens as t } from '@/constants/design-tokens';

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

type PendingSourcePickerAction = 'library' | 'files' | 'camera' | 'server' | null;

export default function LoadImage({ node, serverId, workflowId, sharedImageUri }: LoadImageNodeProps) {
  const updateNodeInput = useWorkflowStore((state) => state.updateNodeInput);
  const server = useServersStore((state) => state.servers.find((s) => s.id === serverId));
  const addQuickAction = useQuickActionStore((state) => state.addAction);
  const removeQuickAction = useQuickActionStore((state) => state.removeAction);
  const hasQuickAction = useQuickActionStore((state) =>
    state.actions.some((a) => a.serverId === serverId && a.workflowId === workflowId && a.targetNodeId === node.id),
  );
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [image, setImage] = useState<string | null>(null);
  const safeAreaInsets = useSafeAreaInsets();
  const c = useDesign();
  const cancelUploadRef = useRef<(() => Promise<void>) | null>(null);
  const sourcePickerModalRef = useRef<BottomSheetModal>(null);
  const pendingSourcePickerActionRef = useRef<PendingSourcePickerAction>(null);
  const serverPickerModalRef = useRef<BottomSheetModal>(null);
  const [isServerPickerVisible, setIsServerPickerVisible] = useState(false);

  // The server's node definition is exhaustive, so a filename missing from it
  // genuinely isn't on the box — flagged rather than left to fail silently as
  // a broken preview image.
  const schema = useNodeSchema(serverId, node.class_type);
  const imageInput = schema?.inputs.image;
  const isMissing =
    imageInput?.kind === 'combo' &&
    typeof node.inputs.image === 'string' &&
    !!node.inputs.image &&
    !imageInput.options.includes(node.inputs.image);

  // Animated value for progress
  const progressWidth = useSharedValue(0);

  useEffect(() => {
    progressWidth.set(withTiming(uploadProgress * 100, { duration: 300 }));
  }, [uploadProgress, progressWidth]);

  useEffect(() => {
    if (isUploading) {
      pendingSourcePickerActionRef.current = null;
      sourcePickerModalRef.current?.dismiss();
    }
  }, [isUploading]);

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

  const normalizeAsset = async (asset: UploadAssetCandidate): Promise<UploadAssetCandidate> => {
    // Always re-encode through ImageManipulator: iOS PHPickerViewController can return
    // HEIC bytes with image/jpeg mimeType and .jpeg extension, so mimeType/filename
    // detection is unreliable.
    const context = ImageManipulator.manipulate(asset.uri);
    const imageRef = await context.renderAsync();
    const result = await imageRef.saveAsync({ format: SaveFormat.JPEG, compress: 0.92 });
    const baseName = (asset.fileName ?? 'image').replace(/\.\w+$/, '');
    return { uri: result.uri, fileName: `${baseName}.jpg`, mimeType: 'image/jpeg' };
  };

  const uploadPickedAsset = async (asset: UploadAssetCandidate) => {
    setIsUploading(true);
    setUploadProgress(0);
    progressWidth.set(0);

    try {
      const normalized = await normalizeAsset(asset);
      const { promise, cancel } = uploadImage(
        normalized.uri,
        normalized.fileName ?? 'image.jpg',
        serverId,
        normalized.mimeType ?? undefined,
        (progress) => {
          setUploadProgress(progress);
        },
      );
      cancelUploadRef.current = cancel;

      const response = await promise;
      // Add a small delay to ensure the server has processed the image
      await new Promise((resolve) => setTimeout(resolve, 500));
      setImage(response.previewUrl);
      updateNodeInput(workflowId, node.id, 'image', response.name);
      // The server's image list is baked into the node definition, so the file
      // we just uploaded won't appear in the server picker until that is
      // refetched.
      clearNodeSchemaCache(serverId);
    } catch (error) {
      if (error instanceof Error && error.message.includes('canceled')) {
        // Upload canceled, do nothing
      } else {
        showToast.error('Error uploading image', error instanceof Error ? error.message : undefined);
      }
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      cancelUploadRef.current = null;
    }
  };

  // Auto-upload shared image from Share Extension. The upload itself is not
  // reactive: it runs once per shared image, with the latest handlers.
  const sharedImageHandled = useRef(false);
  const uploadSharedImage = useEffectEvent((uri: string) => {
    uploadPickedAsset({
      uri,
      fileName: uri.split('/').pop() || 'shared_image.jpg',
      mimeType: null,
    });
  });
  useEffect(() => {
    if (!sharedImageUri || sharedImageHandled.current || isUploading) return;
    sharedImageHandled.current = true;
    uploadSharedImage(sharedImageUri);
  }, [sharedImageUri, isUploading]);

  const handlePickFromLibrary = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      showToast.error('Permission to access media library is required', undefined);
      return;
    }

    let result: ImagePicker.ImagePickerResult;
    let timeoutId: ReturnType<typeof setTimeout>;
    try {
      // Wrap with timeout — expo-image-picker can hang on iPad for certain photos
      const pickerPromise = ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 1,
        shouldDownloadFromNetwork: true,
      });
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('PICKER_TIMEOUT')), 30000);
      });
      result = await Promise.race([pickerPromise, timeoutPromise]);
    } catch (pickerError) {
      if (pickerError instanceof Error && pickerError.message === 'PICKER_TIMEOUT') {
        showToast.error('Photo Library timed out', 'Try using "Files" instead');
      } else {
        showToast.error('Failed to pick image', pickerError instanceof Error ? pickerError.message : undefined);
      }
      return;
    } finally {
      clearTimeout(timeoutId!);
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
      showToast.error('Permission to access camera is required', undefined);
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
      return;
    }

    if (action === 'server') {
      setIsServerPickerVisible(true);
    }
  };

  const handleCloseServerPicker = useCallback(() => {
    setIsServerPickerVisible(false);
  }, []);

  const handleSelectServerImage = useCallback(
    (filename: string) => {
      // No upload, no local preview to set: the effect above rebuilds the
      // preview URL from the node's own input value.
      updateNodeInput(workflowId, node.id, 'image', filename);
    },
    [updateNodeInput, workflowId, node.id],
  );

  const handleToggleQuickAction = useCallback(() => {
    if (hasQuickAction) {
      // Remove existing quick actions for this node
      const existing = useQuickActionStore
        .getState()
        .actions.filter((a) => a.serverId === serverId && a.workflowId === workflowId && a.targetNodeId === node.id);
      existing.forEach((a) => {
        removeQuickAction(a.id);
      });
      showToast.success('Quick Action removed', undefined);
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
      showToast.success('Quick Action enabled', 'Share images from Photos to this node');
    }
  }, [hasQuickAction, removeQuickAction, addQuickAction, serverId, workflowId, node.id, node._meta?.title]);

  return (
    <BaseNode
      node={node}
      badges={
        <Pressable
          onPress={handleToggleQuickAction}
          className={`gap-1.5 rounded-lg px-2.5 py-1.5 flex-row items-center ${
            hasQuickAction ? 'bg-action active:bg-action-pressed' : 'bg-surface-raised active:bg-surface-sunken'
          }`}
        >
          <Icon
            as={Share}
            size="xs"
            className={`${hasQuickAction ? 'text-content-inverse' : 'text-content-tertiary'}`}
          />
          <Copy size="metadata" style={{ fontWeight: '500', color: hasQuickAction ? c.onTint : c.muted }}>
            Quick Action
          </Copy>
        </Pressable>
      }
    >
      <SubItem title="image">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Set image: ${node.inputs.image || 'Choose'}`}
          onPress={handleOpenSourcePicker}
          className={`h-40 rounded-md relative w-full items-center justify-center ${
            isMissing && !isUploading ? 'border-status-danger/50 bg-well border-[0.5px]' : 'bg-surface-raised'
          }`}
        >
          {isMissing && !isUploading ? (
            <VStack space="sm" className="px-4 h-full w-full items-center justify-center">
              <StateIcon icon={AlertTriangle} color={c.danger} />
              <Copy style={{ fontWeight: '400', color: c.danger }} numberOfLines={1}>
                {node.inputs.image}
              </Copy>
              <Copy size="metadata" style={{ color: c.danger }}>
                Not installed on server
              </Copy>
            </VStack>
          ) : image ? (
            <>
              <Image
                source={{ uri: image }}
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: t.radius.panel,
                }}
                contentFit="contain"
                transition={200}
                cachePolicy="memory-disk"
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Clear image"
                hitSlop={8}
                onPress={(event) => {
                  event.stopPropagation();
                  handleClearImage();
                }}
                className="right-2 top-2 bg-media/50 p-1.5 active:opacity-pressed absolute rounded-full"
              >
                <Icon size="sm" as={X} className="text-on-media" />
              </Pressable>
            </>
          ) : !isUploading ? (
            <VStack space="sm" className="h-full w-full items-center justify-center">
              <StateIcon icon={ImageIcon} />
              <Copy muted>Upload Image</Copy>
            </VStack>
          ) : null}
          {isUploading && (
            <VStack space="sm" className="inset-0 rounded-md bg-media/50 p-4 absolute items-center justify-center">
              <StateIcon icon={ImageIcon} color={c.onMedia} />
              <Copy style={{ fontWeight: '400', color: c.onMedia }}>
                Uploading... {Math.round(uploadProgress * 100)}%
              </Copy>
              <View className="h-1 bg-on-media/30 w-full overflow-hidden rounded-full">
                <Animated.View className="bg-action h-full rounded-full" style={animatedProgressStyle} />
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cancel upload"
                hitSlop={4}
                onPress={(event) => {
                  event.stopPropagation();
                  void handleCancelUpload();
                }}
                className="mt-2 bg-on-media/20 p-2 active:opacity-pressed rounded-full"
              >
                <Icon size="lg" as={X} className="text-on-media" />
              </Pressable>
            </VStack>
          )}
        </Pressable>

        <ThemedBottomSheetModal
          ref={sourcePickerModalRef}
          index={0}
          snapPoints={['46%']}
          topInset={safeAreaInsets.top}
          enablePanDownToClose
          onDismiss={handleSourcePickerDismiss}
        >
          <BottomSheetView
            style={{ paddingHorizontal: t.layout.inset, paddingBottom: safeAreaInsets.bottom + t.layout.inset }}
          >
            <VStack space="sm">
              <Title compact className="mb-1">
                Set Image
              </Title>

              <Pressable
                onPress={() => {
                  handleSelectSourcePickerAction('server');
                }}
                className="gap-3 rounded-xl bg-surface-raised px-4 py-3 flex-row items-center"
              >
                <Icon size="sm" as={HardDrive} className="text-content-body" />
                <VStack className="flex-1">
                  <Copy>Already on Server</Copy>
                  <Copy size="metadata" muted>
                    Pick from the server&apos;s input folder — no upload
                  </Copy>
                </VStack>
              </Pressable>

              <Copy size="metadata" muted className="mb-1 mt-2" style={{ fontWeight: '500' }}>
                Upload
              </Copy>

              <Pressable
                onPress={() => {
                  handleSelectSourcePickerAction('library');
                }}
                className="gap-3 rounded-xl bg-surface-raised px-4 py-3 flex-row items-center"
              >
                <Icon size="sm" as={ImageIcon} className="text-content-body" />
                <Copy>Photo Library</Copy>
              </Pressable>

              <Pressable
                onPress={() => {
                  handleSelectSourcePickerAction('files');
                }}
                className="gap-3 rounded-xl bg-surface-raised px-4 py-3 flex-row items-center"
              >
                <Icon size="sm" as={Folder} className="text-content-body" />
                <Copy>Files</Copy>
              </Pressable>

              <Pressable
                onPress={() => {
                  handleSelectSourcePickerAction('camera');
                }}
                className="gap-3 rounded-xl bg-surface-raised px-4 py-3 flex-row items-center"
              >
                <Icon size="sm" as={Camera} className="text-content-body" />
                <Copy>Camera</Copy>
              </Pressable>
            </VStack>
          </BottomSheetView>
        </ThemedBottomSheetModal>

        <ServerImagePicker
          ref={serverPickerModalRef}
          serverId={serverId}
          classType={node.class_type}
          inputName="image"
          value={typeof node.inputs.image === 'string' ? node.inputs.image : ''}
          isVisible={isServerPickerVisible}
          onClose={handleCloseServerPicker}
          onSelect={handleSelectServerImage}
        />
      </SubItem>
    </BaseNode>
  );
}
