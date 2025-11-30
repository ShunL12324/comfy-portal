import { Icon } from '@/components/ui/icon';
import { Modal, ModalBackdrop, ModalBody, ModalContent } from '@/components/ui/modal';
import { Text } from '@/components/ui/text';
import { Image } from 'expo-image';
import { ImageIcon, X } from 'lucide-react-native';
import { MotiView } from 'moti';
import React, { memo, useEffect, useRef, useState } from 'react';
import { Pressable, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import PagerView from 'react-native-pager-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ImageActions } from './image-actions';
import { ProgressOverlay } from './progress-overlay';
import { ZoomableImage } from './zoomable-image';

import { useGenerationProgress, useGenerationStatus } from '@/features/generation/context/generation-context';

import { useVideoPlayer, VideoView } from 'expo-video';
import { PlayCircle } from 'lucide-react-native';

interface ParallaxImageProps {
  workflowId?: string;
  serverId?: string;
}

const VideoPreview = ({ url }: { url: string }) => {
  const player = useVideoPlayer(url, player => {
    player.loop = false;
    player.pause();
    player.muted = true;
  });

  return (
    <VideoView
      player={player}
      style={{ width: '100%', height: '100%' }}
      contentFit="contain"
      nativeControls={false}
    />
  );
};

/**
 * A component that displays an image with parallax scrolling effect and preview functionality
 */
export const ImagePreview = memo(function ParallaxImage({
  workflowId,
  serverId,
}: ParallaxImageProps) {
  const { generatedImages, status } = useGenerationStatus();
  const { progress } = useGenerationProgress();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const [showActionsheet, setShowActionsheet] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const safeAreaInsets = useSafeAreaInsets();
  const pagerRef = useRef<PagerView>(null);
  const modalPagerRef = useRef<PagerView>(null);

  // Sync active index when images change (e.g. new generation)
  useEffect(() => {
    if (generatedImages.length > 0) {
      setActiveIndex(0);
    }
  }, [generatedImages]);

  const handlePageSelected = (e: any) => {
    setActiveIndex(e.nativeEvent.position);
  };

  // When modal closes, sync the main pager to the last viewed index
  const handleModalClose = () => {
    pagerRef.current?.setPageWithoutAnimation(activeIndex);
    setIsPreviewOpen(false);
  };

  const handleZoomableImageClose = () => {
    handleModalClose();
  };

  const handleZoomableImageLongPress = () => {
    setShowActionsheet(true);
  };

  return (
    <View className="relative w-full flex-1 flex-col items-start justify-start">
      {generatedImages.length > 0 ? (
        <View className="h-auto w-full flex-1 justify-start">
          <PagerView
            key={generatedImages.join('-')}
            ref={pagerRef}
            style={{ flex: 1, width: '100%' }}
            initialPage={0}
            onPageSelected={handlePageSelected}
          >
            {generatedImages.map((imageUrl, index) => (
              <View key={`${imageUrl}-${index}`} className="flex-1">
                <Pressable className="flex-1" onPress={() => setIsPreviewOpen(true)}>
                  {['mp4', 'mov', 'm4v', 'webm'].includes(imageUrl.split('.').pop()?.toLowerCase() || '') ? (
                    <View className="flex-1 items-center justify-center bg-black">
                      <VideoPreview url={imageUrl} />
                      <View className="absolute inset-0 items-center justify-center bg-black/20">
                        <Icon as={PlayCircle} className="text-white opacity-90 h-12 w-12" />
                      </View>
                    </View>
                  ) : (
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
                    />
                  )}
                </Pressable>
              </View>
            ))}
          </PagerView>

          {/* Page Indicator */}
          {generatedImages.length > 1 && (
            <View className="absolute bottom-4 left-0 right-0 flex-row justify-center gap-2">
              {generatedImages.map((_, index) => (
                <View
                  key={index}
                  className={`h-2 w-2 rounded-full ${index === activeIndex ? 'bg-primary-500' : 'bg-border-300'
                    }`}
                />
              ))}
            </View>
          )}

          {/* Status Indicators */}
          {/* Status Indicators */}
          <View className="absolute top-3 right-3 flex-row gap-2">
            <View className="min-w-[48px] items-center justify-center rounded-full bg-black/50 px-2.5 py-1">
              <Text className="text-center text-xs font-medium text-white">
                {['mp4', 'mov', 'm4v', 'webm'].includes(generatedImages[activeIndex]?.split('.').pop()?.toLowerCase() || '')
                  ? 'Video'
                  : 'Image'}
              </Text>
            </View>
            {generatedImages.length > 1 && (
              <View className="min-w-[48px] items-center justify-center rounded-full bg-black/50 px-2.5 py-1">
                <Text className="text-center text-xs font-medium text-white">
                  {activeIndex + 1}/{generatedImages.length}
                </Text>
              </View>
            )}
          </View>

          <Modal
            isOpen={isPreviewOpen}
            onClose={handleModalClose}
            useRNModal={false}
            avoidKeyboard={false}
            closeOnOverlayClick
            size="full"
            style={{ margin: 0, padding: 0 }}
          >
            <ModalBackdrop />
            <ModalContent
              className="m-0 h-full rounded-none border-0 bg-black p-0"
              style={{ shadowColor: 'transparent', elevation: 0 }}
              transition={{
                type: 'timing',
                duration: 250,
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
                <PagerView
                  key={generatedImages.join('-')}
                  ref={modalPagerRef}
                  style={{ flex: 1, width: '100%', height: '100%' }}
                  initialPage={activeIndex}
                  onPageSelected={handlePageSelected}
                >
                  {generatedImages.map((imageUrl, index) => (
                    <View key={`modal-${imageUrl}-${index}`} className="flex-1">
                      <ZoomableImage
                        imageUrl={imageUrl}
                        onClose={handleZoomableImageClose}
                        onLongPress={handleZoomableImageLongPress}
                      />
                    </View>
                  ))}
                </PagerView>

                <MotiView
                  from={{ opacity: 1 }}
                  animate={{ opacity: 0 }}
                  transition={{ type: 'timing', duration: 300, delay: 2000 }}
                  className="absolute bottom-16 left-0 right-0 items-center justify-center pointer-events-none"
                >
                  <Text className="text-sm font-medium text-white/70">Long press to open menu</Text>
                </MotiView>

                {generatedImages.length > 1 && (
                  <View className="absolute bottom-8 left-0 right-0 flex-row justify-center gap-2 pointer-events-none">
                    {generatedImages.map((_, index) => (
                      <View
                        key={index}
                        className={`h-2 w-2 rounded-full ${index === activeIndex ? 'bg-white' : 'bg-white/50'
                          }`}
                      />
                    ))}
                  </View>
                )}

                <TouchableOpacity
                  activeOpacity={0.5}
                  onPress={handleModalClose}
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
                imageUrl={generatedImages[activeIndex]}
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
              {status === 'generating' && progress.max > 0 && (
                <Text className="text-xs text-typography-400">
                  Generating... {Math.round((progress.value / progress.max) * 100)}%
                </Text>
              )}
            </View>
          </View>
        </View>
      )}

      {status === 'generating' && progress.value > 0 && progress.value < progress.max && (
        <ProgressOverlay current={progress.value} total={progress.max} />
      )}
    </View>
  );
});
