import {
  Actionsheet,
  ActionsheetBackdrop,
  ActionsheetContent,
  ActionsheetDragIndicator,
  ActionsheetDragIndicatorWrapper,
  ActionsheetItem,
  ActionsheetItemText,
} from '@/components/ui/actionsheet';
import { Box } from '@/components/ui/box';
import { Center } from '@/components/ui/center';
import { Icon } from '@/components/ui/icon';
import {
  Modal,
  ModalBackdrop,
  ModalBody,
  ModalContent,
} from '@/components/ui/modal';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { usePresetsStore } from '@/store/presets';
import { savePresetThumbnail } from '@/utils/image-storage';
import { showToast } from '@/utils/toast';
import { Image } from 'expo-image';
import * as MediaLibrary from 'expo-media-library';
import { ImageIcon, Save, X } from 'lucide-react-native';
import { MotiView } from 'moti';
import { memo, useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Props for the progress overlay component
 */
interface ProgressOverlayProps {
  /** Current progress value */
  current: number;
  /** Total progress value */
  total: number;
}

/**
 * A component that displays a progress overlay with animated width
 */
const ProgressOverlay = memo(function ProgressOverlay({
  current,
  total,
}: ProgressOverlayProps) {
  const progressPercentage = useMemo(
    () => Math.round((current / total) * 100),
    [current, total],
  );

  const animationConfig = Platform.select({
    ios: {
      type: 'timing' as const,
      duration: 300,
    },
    android: {
      type: 'timing' as const,
      duration: 200,
    },
  });

  return (
    <MotiView
      className="absolute bottom-0 h-full bg-black/50 backdrop-blur-sm"
      animate={{
        width: `${progressPercentage}%`,
      }}
      transition={animationConfig}
    />
  );
});

/**
 * Props for the image preview component
 */
interface ImagePreviewProps {
  /** URL of the image to display */
  imageUrl?: string;
  /** Progress information for image generation */
  progress?: {
    current: number;
    total: number;
  };
  /** Whether the full-screen preview is open */
  isPreviewOpen?: boolean;
  /** Callback when the preview is closed */
  onPreviewClose?: () => void;
  /** Current preset ID */
  presetId?: string;
  /** Current server ID */
  serverId?: string;
}

/**
 * A component that displays an image with preview functionality and gesture controls
 * Features:
 * - Image preview with zoom and pan gestures
 * - Progress overlay for image generation
 * - Full-screen preview mode
 * - Smooth animations with spring physics
 */
export const ImagePreview = memo(function ImagePreview({
  imageUrl,
  progress,
  isPreviewOpen = false,
  onPreviewClose,
  presetId,
  serverId,
}: ImagePreviewProps) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const [showActionsheet, setShowActionsheet] = useState(false);
  const [permissionResponse, requestPermission] = MediaLibrary.usePermissions();
  const safeAreaInsets = useSafeAreaInsets();

  /*
   * Gesture state management
   */
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  /**
   * Spring configuration for smooth animations
   * - Lower mass for faster response
   * - Higher damping for less bounce
   * - Moderate stiffness for natural feel
   */
  const springConfig = {
    damping: 20,
    mass: 0.5,
    stiffness: 200,
  };

  /*
   * Gesture handlers
   */
  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      savedScale.value = scale.value;
    })
    .onUpdate((e) => {
      scale.value = Math.min(Math.max(savedScale.value * e.scale, 0.5), 3);
    })
    .onEnd(() => {
      if (scale.value < 1) {
        scale.value = withSpring(1, springConfig);
        translateX.value = withSpring(0, springConfig);
        translateY.value = withSpring(0, springConfig);
      } else if (scale.value > 3) {
        scale.value = withSpring(3, springConfig);
      }
      savedScale.value = scale.value;
    });

  const panGesture = Gesture.Pan()
    .onStart(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    })
    .onUpdate((e) => {
      const maxOffset = Math.max(((scale.value - 1) * screenWidth) / 2, 0);
      translateX.value = Math.min(
        Math.max(savedTranslateX.value + e.translationX, -maxOffset),
        maxOffset,
      );
      translateY.value = Math.min(
        Math.max(savedTranslateY.value + e.translationY, -maxOffset),
        maxOffset,
      );
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const gesture = Gesture.Simultaneous(pinchGesture, panGesture);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

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
        setShowActionsheet(false);
        showToast.success(
          'Image saved to your gallery',
          undefined,
          safeAreaInsets.top + 16,
        );
      }
    } catch (error) {
      console.error('Failed to save image:', error);
      showToast.error(
        'Failed to save image',
        undefined,
        safeAreaInsets.top + 16,
      );
    }
  };

  const handleSetAsThumbnail = async () => {
    if (!imageUrl || !presetId || !serverId) return;

    try {
      const savedImage = await savePresetThumbnail({
        serverId,
        presetId,
        imageUri: imageUrl,
      });

      if (savedImage) {
        const localImageUri = savedImage.path.startsWith('file://')
          ? savedImage.path
          : `file://${savedImage.path}`;

        usePresetsStore.getState().updatePreset(presetId, {
          thumbnail: localImageUri,
        });

        showToast.success(
          'Thumbnail updated',
          undefined,
          safeAreaInsets.top + 16,
        );
      }
    } catch (error) {
      console.error('Failed to set thumbnail:', error);
      showToast.error(
        'Failed to set thumbnail',
        undefined,
        safeAreaInsets.top + 16,
      );
    }
    setShowActionsheet(false);
  };

  return (
    <Box className="relative h-full w-full border-0 p-0">
      {imageUrl && imageUrl.length > 0 ? (
        <Center className="h-full w-full">
          <Box className="relative h-full w-full">
            <Image
              source={{ uri: imageUrl }}
              style={{
                width: '100%',
                height: '100%',
              }}
              contentFit="cover"
              cachePolicy="memory-disk"
            />

            <Modal
              isOpen={isPreviewOpen}
              onClose={() => {
                onPreviewClose?.();
                scale.value = 1;
                savedScale.value = 1;
                translateX.value = 0;
                translateY.value = 0;
                savedTranslateX.value = 0;
                savedTranslateY.value = 0;
              }}
              useRNModal={false}
              avoidKeyboard={false}
              closeOnOverlayClick
              size="full"
              style={{
                margin: 0,
                padding: 0,
              }}
            >
              <ModalBackdrop />
              <ModalContent
                className="m-0 h-full rounded-none border-0 bg-black p-0"
                style={{
                  shadowColor: 'transparent',
                  elevation: 0,
                }}
              >
                <ModalBody
                  className="h-full flex-1 p-0"
                  contentContainerStyle={{
                    flex: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 0,
                    margin: 0,
                  }}
                >
                  <GestureHandlerRootView className="h-full w-full">
                    <GestureDetector gesture={gesture}>
                      <Animated.View
                        style={[
                          { height: '100%', width: '100%' },
                          containerStyle,
                        ]}
                      >
                        <Pressable
                          className="h-full w-full"
                          onPress={onPreviewClose}
                          onLongPress={() => {
                            setShowActionsheet(true);
                          }}
                          delayLongPress={500}
                        >
                          <Image
                            source={{ uri: imageUrl }}
                            style={{
                              width: '100%',
                              height: '100%',
                            }}
                            contentFit="contain"
                          />
                        </Pressable>
                      </Animated.View>
                    </GestureDetector>
                  </GestureHandlerRootView>

                  <MotiView
                    from={{
                      opacity: 1,
                    }}
                    animate={{
                      opacity: 0,
                    }}
                    transition={{
                      type: 'timing',
                      duration: 300,
                      delay: 2000,
                    }}
                    className="absolute bottom-16 left-0 right-0 items-center justify-center"
                  >
                    <Text className="text-sm font-medium text-white/70">
                      Long press to open menu
                    </Text>
                  </MotiView>

                  <TouchableOpacity
                    activeOpacity={0.5}
                    onPress={onPreviewClose}
                    style={{
                      position: 'absolute',
                      top: 12,
                      right: 12,
                      backgroundColor: 'rgba(0,0,0,0.3)',
                      borderRadius: 8,
                      padding: 8,
                      zIndex: 30,
                    }}
                  >
                    <Icon as={X} size="sm" className="text-white" />
                  </TouchableOpacity>

                  <Actionsheet
                    isOpen={showActionsheet}
                    onClose={() => setShowActionsheet(false)}
                  >
                    <ActionsheetBackdrop />
                    <ActionsheetContent className="bg-background-0">
                      <ActionsheetDragIndicatorWrapper>
                        <ActionsheetDragIndicator />
                      </ActionsheetDragIndicatorWrapper>
                      <ActionsheetItem
                        onPress={handleSaveToGallery}
                        className="flex-row items-center gap-3"
                      >
                        <Icon as={Save} size="sm" />
                        <ActionsheetItemText>Save Image</ActionsheetItemText>
                      </ActionsheetItem>
                      {presetId && (
                        <ActionsheetItem
                          onPress={handleSetAsThumbnail}
                          className="mb-8 flex-row items-center gap-3"
                        >
                          <Icon as={ImageIcon} size="sm" />
                          <ActionsheetItemText>
                            Set as Preset Thumbnail
                          </ActionsheetItemText>
                        </ActionsheetItem>
                      )}
                    </ActionsheetContent>
                  </Actionsheet>
                </ModalBody>
              </ModalContent>
            </Modal>
          </Box>
        </Center>
      ) : (
        <Center className="h-full w-full bg-background-0">
          <VStack space="md" className="items-center">
            <Icon as={ImageIcon} size="xl" className="text-typography-500" />
            <VStack space="xs" className="items-center">
              <Text className="text-sm text-typography-500">
                No image generated yet
              </Text>
              {progress && progress.current > 0 && (
                <Text className="text-xs text-typography-400">
                  Generating...{' '}
                  {Math.round((progress.current / progress.total) * 100)}%
                </Text>
              )}
            </VStack>
          </VStack>
        </Center>
      )}

      {progress &&
        progress.current > 0 &&
        progress.current < progress.total && (
          <ProgressOverlay current={progress.current} total={progress.total} />
        )}
    </Box>
  );
});
