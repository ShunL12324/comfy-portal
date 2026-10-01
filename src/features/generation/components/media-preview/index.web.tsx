import { Copy, Row, useDesign } from '@/components/ui/design-system/primitives';
import { Spinner } from '@/components/ui/spinner';
import { Icon } from '@/components/ui/icon';
import { ImageIcon, PlayCircle } from '@/constants/icons';
import React, { memo, useCallback, useMemo, useRef, useState } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';

import { ProgressOverlay } from './progress-overlay';
import { MediaViewer, toViewerItem, type MediaViewerItem } from '@/features/gallery/components/media-viewer';
import { deleteGeneratedMedia } from '@/services/image-storage';

import {
  useGenerationActions,
  useGenerationProgress,
  useGenerationStatus,
} from '@/features/generation/context/generation-context';
import { designTokens as t } from '@/constants/design-tokens';
import { Pressable } from '@/components/ui/pressable';

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
  return <video src={url} style={{ width: '100%', height: '100%', objectFit: 'contain' }} muted playsInline />;
};

/**
 * Web version of MediaPreview - uses ScrollView with scroll-snap instead of PagerView
 */
export const MediaPreview = memo(function ParallaxMedia({ workflowId, serverId }: ParallaxMediaProps) {
  const { generatedMedia, status, currentNodeId } = useGenerationStatus();
  const { progress, nodeProgress, downloadProgress } = useGenerationProgress();
  const { setGeneratedMedia } = useGenerationActions();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const c = useDesign();
  const scrollRef = useRef<ScrollView>(null);

  const viewerItems = useMemo(() => generatedMedia.map((uri) => toViewerItem(uri)), [generatedMedia]);
  // Results are already saved to the gallery; deleting one removes it there and from this run.
  const deleteResult = async (item: MediaViewerItem) => {
    await deleteGeneratedMedia([item.uri]);
    setGeneratedMedia(generatedMedia.filter((uri) => uri !== item.uri));
  };
  const mediaKey = generatedMedia.join('|');
  const [previousMediaKey, setPreviousMediaKey] = useState(mediaKey);
  if (previousMediaKey !== mediaKey) {
    setPreviousMediaKey(mediaKey);
    setActiveIndex(0);
  }

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetX = e.nativeEvent.contentOffset.x;
      const page = Math.round(offsetX / screenWidth);
      if (page >= 0 && page < generatedMedia.length) {
        setActiveIndex(page);
      }
    },
    [screenWidth, generatedMedia.length],
  );

  // When modal closes, sync the main scroll to the last viewed index
  const handleModalClose = () => {
    scrollRef.current?.scrollTo({ x: activeIndex * screenWidth, animated: false });
    setIsPreviewOpen(false);
  };

  return (
    <View className="relative w-full flex-1 flex-col items-start justify-start">
      {generatedMedia.length > 0 ? (
        <View className="h-auto w-full flex-1 justify-start">
          <ScrollView
            key={generatedMedia.join('-')}
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleScroll}
            style={{ flex: 1, width: '100%' }}
            contentContainerStyle={styles.scrollContent}
          >
            {generatedMedia.map((mediaUrl, index) => (
              <View key={`${mediaUrl}-${index}`} style={{ width: screenWidth, flex: 1 }}>
                <Pressable style={{ flex: 1 }} onPress={() => setIsPreviewOpen(true)}>
                  {isVideoUrl(mediaUrl) ? (
                    <View className="bg-media flex-1 items-center justify-center">
                      <VideoPreview url={mediaUrl} />
                      <View className="inset-0 bg-media/20 absolute items-center justify-center">
                        <Icon size="display" as={PlayCircle} className="text-on-media" />
                      </View>
                    </View>
                  ) : (
                    <img
                      src={mediaUrl}
                      style={{
                        width: screenWidth,
                        height: screenHeight,
                        objectFit: 'contain',
                        objectPosition: 'top',
                      }}
                      alt="Generated media"
                    />
                  )}
                </Pressable>
              </View>
            ))}
          </ScrollView>

          {/* Page Indicator */}
          {generatedMedia.length > 1 && (
            <View className="bottom-4 left-0 right-0 gap-2 absolute flex-row justify-center">
              {generatedMedia.map((_, index) => (
                <View
                  key={index}
                  className={`h-2 w-2 rounded-full ${index === activeIndex ? 'bg-action' : 'bg-stroke'}`}
                />
              ))}
            </View>
          )}

          {/* Status Indicators */}
          <View className="top-3 right-3 gap-2 absolute flex-row">
            <View className="bg-media/50 px-2.5 py-1 min-w-[48px] items-center justify-center rounded-full">
              <Copy size="metadata" style={{ color: c.onMedia, fontWeight: '500', textAlign: 'center' }}>
                {isVideoUrl(generatedMedia[activeIndex] || '') ? 'Video' : 'Image'}
              </Copy>
            </View>
            {generatedMedia.length > 1 && (
              <View className="bg-media/50 px-2.5 py-1 min-w-[48px] items-center justify-center rounded-full">
                <Copy size="metadata" style={{ color: c.onMedia, fontWeight: '500', textAlign: 'center' }}>
                  {activeIndex + 1}/{generatedMedia.length}
                </Copy>
              </View>
            )}
          </View>

          <MediaViewer
            items={viewerItems}
            initialIndex={activeIndex}
            visible={isPreviewOpen}
            onClose={handleModalClose}
            onIndexChange={setActiveIndex}
            workflowId={workflowId}
            serverId={serverId}
            onDelete={deleteResult}
          />
        </View>
      ) : (
        <View
          className="bg-surface-base w-full items-center"
          style={{ paddingHorizontal: t.layout.section, paddingTop: t.layout.section, gap: t.layout.related }}
        >
          <Row style={{ gap: t.layout.related }}>
            {status !== 'idle' ? (
              <Spinner size="small" />
            ) : (
              <Icon as={ImageIcon} size="sm" className="text-content-secondary" />
            )}
            <Copy>
              {status === 'generating'
                ? 'Generating output'
                : status === 'downloading'
                  ? 'Saving results'
                  : 'Your results appear here'}
            </Copy>
          </Row>
          <Copy muted size="label" style={{ textAlign: 'center' }}>
            {status === 'generating'
              ? nodeProgress.total > 0
                ? `${nodeProgress.completed} / ${nodeProgress.total} nodes complete`
                : 'Waiting for the server to begin execution.'
              : status === 'downloading'
                ? `${Math.round(downloadProgress)}% of output files saved`
                : 'Adjust the workflow below, then generate.'}
          </Copy>
          {status === 'generating' && progress.max > 0 && (
            <Copy mono muted size="metadata">
              Step {progress.value} / {progress.max} · current node
            </Copy>
          )}
        </View>
      )}

      {generatedMedia.length > 0 && status === 'generating' && progress.max > 0 && (
        <ProgressOverlay key={currentNodeId} current={progress.value} total={progress.max} />
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  scrollContent: {
    flexDirection: 'row',
  },
});
