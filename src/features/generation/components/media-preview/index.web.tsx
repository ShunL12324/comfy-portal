import { useDesign } from '@/components/ui/design-system/primitives';
import { PlayCircle } from '@/constants/icons';
import React, { memo, useCallback, useMemo, useRef, useState } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import type { SharedValue } from 'react-native-reanimated';

import { MediaViewer, toViewerItem, type MediaViewerItem } from '@/features/gallery/components/media-viewer';
import { deleteGeneratedMedia } from '@/services/image-storage';

import { useGenerationActions, useGenerationStatus } from '@/features/generation/context/generation-context';
import { designTokens as t, iconStroke } from '@/constants/design-tokens';
import { Pressable } from '@/components/ui/pressable';
import { MediaBadge } from './media-badge';
import { ResultPlaceholder } from './result-placeholder';
import { VisibleRegion } from './visible-region';

const VIDEO_EXTENSIONS = ['mp4', 'mov', 'm4v', 'webm'];

const isVideoUrl = (url: string): boolean => {
  const ext = url.split('.').pop()?.toLowerCase() || '';
  return VIDEO_EXTENSIONS.includes(ext);
};

interface ParallaxMediaProps {
  workflowId?: string;
  serverId?: string;
  /** Top edge of the sheet covering the area's lower part, in the parent's coordinates. */
  coverTop?: SharedValue<number>;
}

const VideoPreview = ({ url }: { url: string }) => {
  return <video src={url} style={{ width: '100%', height: '100%', objectFit: 'contain' }} muted playsInline />;
};

/**
 * Web version of MediaPreview - uses ScrollView with scroll-snap instead of PagerView
 */
export const MediaPreview = memo(function ParallaxMedia({ workflowId, serverId, coverTop }: ParallaxMediaProps) {
  const { generatedMedia } = useGenerationStatus();
  const { setGeneratedMedia } = useGenerationActions();
  const { width: screenWidth } = useWindowDimensions();
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
    <VisibleRegion coverTop={coverTop}>
      {generatedMedia.length > 0 ? (
        <>
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
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.media }}>
                      <VideoPreview url={mediaUrl} />
                      <View
                        pointerEvents="none"
                        style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' }}
                      >
                        <PlayCircle size={t.icon.display} color={c.onMedia} strokeWidth={iconStroke(t.icon.display)} />
                      </View>
                    </View>
                  ) : (
                    <img
                      src={mediaUrl}
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      alt="Generated media"
                    />
                  )}
                </Pressable>
              </View>
            ))}
          </ScrollView>

          {/* Page Indicator */}
          {generatedMedia.length > 1 && (
            <View
              pointerEvents="none"
              className="gap-2 absolute flex-row justify-center"
              style={{ left: 0, right: 0, bottom: t.layout.field }}
            >
              {generatedMedia.map((_, index) => (
                <View
                  key={index}
                  className={`h-2 w-2 rounded-full ${index === activeIndex ? 'bg-action' : 'bg-stroke'}`}
                />
              ))}
            </View>
          )}

          {/* Media type and page badges */}
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: t.layout.field,
              right: t.layout.field,
              flexDirection: 'row',
              gap: t.layout.label,
            }}
          >
            <MediaBadge>{isVideoUrl(generatedMedia[activeIndex] || '') ? 'Video' : 'Image'}</MediaBadge>
            {generatedMedia.length > 1 && (
              <MediaBadge>
                {activeIndex + 1}/{generatedMedia.length}
              </MediaBadge>
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
        </>
      ) : (
        <ResultPlaceholder />
      )}
    </VisibleRegion>
  );
});

const styles = StyleSheet.create({
  scrollContent: {
    flexDirection: 'row',
  },
});
