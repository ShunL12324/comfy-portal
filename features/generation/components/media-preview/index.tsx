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

import { MediaActions } from './media-actions';
import { ProgressOverlay } from './progress-overlay';
import { ZoomableMedia } from './zoomable-media';

import { useGenerationProgress, useGenerationStatus } from '@/features/generation/context/generation-context';

import { useVideoPlayer, VideoView } from 'expo-video';
import { PlayCircle } from 'lucide-react-native';

const VIDEO_EXTENSIONS = ['mp4', 'mov', 'm4v', 'webm'];

const isVideoUrl = (url: string): boolean => {
  const ext = url.split('.').pop()?.toLowerCase() || '';
  return VIDEO_EXTENSIONS.includes(ext);
};

interface ParallaxMediaProps {
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
 * A component that displays media with parallax scrolling effect and preview functionality
 */
export const MediaPreview = memo(function ParallaxMedia({
  workflowId,
  serverId,
}: ParallaxMediaProps) {
  const { generatedMedia, status } = useGenerationStatus();
  const { progress } = useGenerationProgress();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const [showActionsheet, setShowActionsheet] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const safeAreaInsets = useSafeAreaInsets();
  const pagerRef = useRef<PagerView>(null);
  const modalPagerRef = useRef<PagerView>(null);

  // Sync active index when media change (e.g. new generation)
  useEffect(() => {
    if (generatedMedia.length > 0) {
      setActiveIndex(0);
    }
  }, [generatedMedia]);

  const handlePageSelected = (e: any) => {
    setActiveIndex(e.nativeEvent.position);
  };

  // When modal closes, sync the main pager to the last viewed index
  const handleModalClose = () => {
    pagerRef.current?.setPageWithoutAnimation(activeIndex);
    setIsPreviewOpen(false);
  };

  const handleZoomableMediaClose = () => {
    handleModalClose();
  };

  const handleZoomableMediaLongPress = () => {
    setShowActionsheet(true);
  };

  return (
    <View className="relative w-full flex-1 flex-col items-start justify-start">
      {generatedMedia.length > 0 ? (
        <View className="h-auto w-full flex-1 justify-start">
          <PagerView
            key={generatedMedia.join('-')}
            ref={pagerRef}
            style={{ flex: 1, width: '100%' }}
            initialPage={0}
            onPageSelected={handlePageSelected}
          >
            {generatedMedia.map((mediaUrl, index) => (
              <View key={`${mediaUrl}-${index}`} className="flex-1">
                <Pressable className="flex-1" onPress={() => setIsPreviewOpen(true)}>
                  {isVideoUrl(mediaUrl) ? (
                    <View className="flex-1 items-center justify-center bg-black">
                      <VideoPreview url={mediaUrl} />
                      <View className="absolute inset-0 items-center justify-center bg-black/20">
                        <Icon as={PlayCircle} className="text-white opacity-90 h-12 w-12" />
                      </View>
                    </View>
                  ) : (
                    <Image
                      source={{ uri: mediaUrl }}
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
          {generatedMedia.length > 1 && (
            <View className="absolute bottom-4 left-0 right-0 flex-row justify-center gap-2">
              {generatedMedia.map((_, index) => (
                <View
                  key={index}
                  className={`h-2 w-2 rounded-full ${index === activeIndex ? 'bg-primary-500' : 'bg-border-300'
                    }`}
                />
              ))}
            </View>
          )}

          {/* Status Indicators */}
          <View className="absolute top-3 right-3 flex-row gap-2">
            <View className="min-w-[48px] items-center justify-center rounded-full bg-black/50 px-2.5 py-1">
              <Text className="text-center text-xs font-medium text-white">
                {isVideoUrl(generatedMedia[activeIndex] || '')
                  ? 'Video'
                  : 'Image'}
              </Text>
            </View>
            {generatedMedia.length > 1 && (
              <View className="min-w-[48px] items-center justify-center rounded-full bg-black/50 px-2.5 py-1">
                <Text className="text-center text-xs font-medium text-white">
                  {activeIndex + 1}/{generatedMedia.length}
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
                {isPreviewOpen && (
                  <PagerView
                    key={generatedMedia.join('-')}
                    ref={modalPagerRef}
                    style={{ flex: 1, width: '100%', height: '100%' }}
                    initialPage={activeIndex}
                    onPageSelected={handlePageSelected}
                  >
                    {generatedMedia.map((mediaUrl, index) => (
                      <View key={`modal-${mediaUrl}-${index}`} className="flex-1">
                        <ZoomableMedia
                          mediaUrl={mediaUrl}
                          onClose={handleZoomableMediaClose}
                          onLongPress={handleZoomableMediaLongPress}
                        />
                      </View>
                    ))}
                  </PagerView>
                )}

                <MotiView
                  from={{ opacity: 1 }}
                  animate={{ opacity: 0 }}
                  transition={{ type: 'timing', duration: 300, delay: 2000 }}
                  className="absolute bottom-16 left-0 right-0 items-center justify-center pointer-events-none"
                >
                  <Text className="text-sm font-medium text-white/70">Long press to open menu</Text>
                </MotiView>

                {generatedMedia.length > 1 && (
                  <View className="absolute bottom-8 left-0 right-0 flex-row justify-center gap-2 pointer-events-none">
                    {generatedMedia.map((_, index) => (
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
              <MediaActions
                isOpen={showActionsheet}
                onClose={() => setShowActionsheet(false)}
                mediaUrl={generatedMedia[activeIndex]}
                workflowId={workflowId}
                serverId={serverId}
              />
            </ModalContent>
          </Modal>
        </View>
      ) : (
        <View className="h-full w-full items-center justify-center bg-background-0">
          <View className="items-center gap-4 px-6">
            <View className="rounded-full bg-background-50 p-3">
              <Icon as={ImageIcon} size="xl" className="h-10 w-10 text-typography-300" />
            </View>
            <View className="items-center gap-1">
              <Text className="text-base font-semibold text-typography-800">No Media Yet</Text>
              <Text className="text-center text-sm text-typography-500">
                Generate an image to preview results here.
              </Text>
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
