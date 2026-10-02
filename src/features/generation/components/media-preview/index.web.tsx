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
import { isVideoUrl } from '@/features/generation/utils/media';
import { followPage, resultPages, type PagerPosition } from '@/features/generation/utils/run-results';
import { PageDots, PendingResultPage, ResultAppear, ResultBadges } from './result-overlays';
import { ResultPlaceholder } from './result-placeholder';
import { VisibleRegion } from './visible-region';

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
  const { generatedMedia, pendingResults, resultsKey } = useGenerationStatus();
  const { setGeneratedMedia } = useGenerationActions();
  const { width: screenWidth } = useWindowDimensions();
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const c = useDesign();
  const scrollRef = useRef<ScrollView>(null);

  // Results fill their placeholder pages in place, so the scroll content keeps
  // its width while a run's outputs arrive.
  const pages = useMemo(() => resultPages(generatedMedia, pendingResults), [generatedMedia, pendingResults]);
  const [position, setPosition] = useState<PagerPosition>({ resultsKey, index: 0 });
  const followed = followPage(position, resultsKey, pages.length);
  if (followed !== position) setPosition(followed);
  const activeIndex = followed.index;
  const pageCount = pages.length;

  const viewerItems = useMemo(() => generatedMedia.map((uri) => toViewerItem(uri)), [generatedMedia]);
  // Results are already saved to the gallery; deleting one removes it there and from this run.
  const deleteResult = async (item: MediaViewerItem) => {
    await deleteGeneratedMedia([item.uri]);
    setGeneratedMedia(generatedMedia.filter((uri) => uri !== item.uri));
  };

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetX = e.nativeEvent.contentOffset.x;
      const page = Math.round(offsetX / screenWidth);
      if (page >= 0 && page < pageCount) {
        setPosition({ resultsKey, index: page });
      }
    },
    [screenWidth, pageCount, resultsKey],
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
            key={resultsKey}
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleScroll}
            style={{ flex: 1, width: '100%' }}
            contentContainerStyle={styles.scrollContent}
          >
            {pages.map((page, index) => (
              <View key={`page-${index}`} style={{ width: screenWidth, flex: 1 }}>
                {page.kind === 'pending' ? (
                  <PendingResultPage position={index + 1} total={pages.length} />
                ) : (
                  <ResultAppear>
                    <Pressable style={{ flex: 1 }} onPress={() => setIsPreviewOpen(true)}>
                      {isVideoUrl(page.uri) ? (
                        <View
                          style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.media }}
                        >
                          <VideoPreview url={page.uri} />
                          <View
                            pointerEvents="none"
                            style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' }}
                          >
                            <PlayCircle
                              size={t.icon.display}
                              color={c.onMedia}
                              strokeWidth={iconStroke(t.icon.display)}
                            />
                          </View>
                        </View>
                      ) : (
                        <img
                          src={page.uri}
                          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                          alt="Generated media"
                        />
                      )}
                    </Pressable>
                  </ResultAppear>
                )}
              </View>
            ))}
          </ScrollView>

          <PageDots pages={pages} activeIndex={activeIndex} />
          <ResultBadges pages={pages} activeIndex={activeIndex} />

          <MediaViewer
            items={viewerItems}
            initialIndex={Math.min(activeIndex, viewerItems.length - 1)}
            visible={isPreviewOpen}
            onClose={handleModalClose}
            onIndexChange={(index) => setPosition({ resultsKey, index })}
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
