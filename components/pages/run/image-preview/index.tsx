import { Icon } from '@/components/ui/icon';
import { Modal, ModalBackdrop, ModalBody, ModalContent } from '@/components/ui/modal';
import { Text } from '@/components/ui/text';
import { Image } from 'expo-image';
import { ImageIcon, X } from 'lucide-react-native';
import { MotiView } from 'moti';
import React, { memo, useState } from 'react';
import { Pressable, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Reanimated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ImageActions } from './image-actions';
import { ProgressOverlay } from './progress-overlay';

/**
 * Props for the parallax scrolling image component
 */
interface ParallaxImageProps {
  imageUrl?: string;
  progress?: { current: number; total: number };
  workflowId?: string;
  serverId?: string;
}

/**
 * A component that displays an image with parallax scrolling effect and preview functionality
 */
export const ImagePreview = memo(function ParallaxImage({
  imageUrl,
  progress,
  workflowId,
  serverId,
}: ParallaxImageProps) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const [showActionsheet, setShowActionsheet] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const safeAreaInsets = useSafeAreaInsets();

  // Preview gesture values
  const previewScale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const previewTranslateX = useSharedValue(0);
  const previewTranslateY = useSharedValue(0);
  const savedPreviewTranslateX = useSharedValue(0);
  const savedPreviewTranslateY = useSharedValue(0);

  const springConfig = {
    damping: 20,
    mass: 0.5,
    stiffness: 200,
  };

  // Gesture handlers
  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      savedScale.value = previewScale.value;
    })
    .onUpdate((e) => {
      previewScale.value = Math.min(Math.max(savedScale.value * e.scale, 0.5), 3);
    })
    .onEnd(() => {
      if (previewScale.value < 1) {
        previewScale.value = withSpring(1, springConfig);
        previewTranslateX.value = withSpring(0, springConfig);
        previewTranslateY.value = withSpring(0, springConfig);
      } else if (previewScale.value > 3) {
        previewScale.value = withSpring(3, springConfig);
      }
      savedScale.value = previewScale.value;
    });

  const panGesture = Gesture.Pan()
    .onStart(() => {
      savedPreviewTranslateX.value = previewTranslateX.value;
      savedPreviewTranslateY.value = previewTranslateY.value;
    })
    .onUpdate((e) => {
      const maxOffset = Math.max(((previewScale.value - 1) * screenWidth) / 2, 0);
      previewTranslateX.value = Math.min(
        Math.max(savedPreviewTranslateX.value + e.translationX, -maxOffset),
        maxOffset,
      );
      previewTranslateY.value = Math.min(
        Math.max(savedPreviewTranslateY.value + e.translationY, -maxOffset),
        maxOffset,
      );
    })
    .onEnd(() => {
      savedPreviewTranslateX.value = previewTranslateX.value;
      savedPreviewTranslateY.value = previewTranslateY.value;
    });

  const gesture = Gesture.Simultaneous(pinchGesture, panGesture);

  const previewStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: previewTranslateX.value },
      { translateY: previewTranslateY.value },
      { scale: previewScale.value },
    ],
  }));

  const resetPreviewValues = () => {
    previewScale.value = 1;
    savedScale.value = 1;
    previewTranslateX.value = 0;
    previewTranslateY.value = 0;
    savedPreviewTranslateX.value = 0;
    savedPreviewTranslateY.value = 0;
    savedPreviewTranslateY.value = 0;
  };

  return (
    <View className="relative w-full flex-1 flex-col items-start justify-start">
      {imageUrl ? (
        <View className="h-auto w-full flex-1 justify-start">
          <Image
            source={{ uri: imageUrl }}
            style={{
              width: screenWidth,
              height: screenHeight,
              aspectRatio: undefined,
            }}
            contentFit="contain"
            contentPosition="top"
            cachePolicy="memory-disk"
            onTouchEnd={() => setIsPreviewOpen(true)}
          />

          <Modal
            isOpen={isPreviewOpen}
            onClose={() => {
              setIsPreviewOpen(false);
              resetPreviewValues();
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
                    <Reanimated.View style={[{ height: '100%', width: '100%' }, previewStyle]}>
                      <Pressable
                        className="h-full w-full"
                        onPress={() => setIsPreviewOpen(false)}
                        onLongPress={() => setShowActionsheet(true)}
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
                    </Reanimated.View>
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
                  <Text className="text-sm font-medium text-white/70">Long press to open menu</Text>
                </MotiView>

                <TouchableOpacity
                  activeOpacity={0.5}
                  onPress={() => setIsPreviewOpen(false)}
                  style={{
                    position: 'absolute',
                    top: safeAreaInsets.top + 12,
                    right: 12,
                    backgroundColor: 'rgba(0,0,0,0.3)',
                    borderRadius: 8,
                    padding: 8,
                    zIndex: 30,
                  }}
                >
                  <Icon as={X} size="sm" className="text-white" />
                </TouchableOpacity>

              </ModalBody>
              <ImageActions
                isOpen={showActionsheet}
                onClose={() => setShowActionsheet(false)}
                imageUrl={imageUrl}
                workflowId={workflowId}
                serverId={serverId}
              />
            </ModalContent>
          </Modal>
        </View>
      ) : (
        <View className="h-full w-full items-center justify-center bg-background-0">
          <View className="items-center gap-4">
            <Icon as={ImageIcon} size="xl" className="text-typography-500" />
            <View className="items-center gap-1">
              <Text className="text-sm text-typography-500">No image generated yet</Text>
              {progress && progress.current > 0 && (
                <Text className="text-xs text-typography-400">
                  Generating... {Math.round((progress.current / progress.total) * 100)}%
                </Text>
              )}
            </View>
          </View>
        </View>
      )}

      {progress && progress.current > 0 && progress.current < progress.total && (
        <ProgressOverlay current={progress.current} total={progress.total} />
      )}


    </View>
  );
});
