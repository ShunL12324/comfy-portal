import { useDesign } from '@/components/ui/design-system/primitives';
import { Image } from 'expo-image';
import { PlayCircle } from '@/constants/icons';
import React, { memo, useCallback, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import PagerView from 'react-native-pager-view';
import type { SharedValue } from 'react-native-reanimated';

import { MediaViewer, toViewerItem, type MediaViewerItem } from '@/features/gallery/components/media-viewer';
import { deleteGeneratedMedia } from '@/services/image-storage';

import { useGenerationActions, useGenerationStatus } from '@/features/generation/context/generation-context';
import { isVideoUrl } from '@/features/generation/utils/media';

import { useVideoPlayer, VideoView } from 'expo-video';
import { designTokens as t, iconStroke } from '@/constants/design-tokens';
import { Pressable } from '@/components/ui/pressable';
import { followPage, movePage, resultPages, type PagerPosition } from '@/features/generation/utils/run-results';
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
  const player = useVideoPlayer(url, (player) => {
    player.loop = false;
    player.pause();
    player.muted = true;
  });

  return (
    <VideoView player={player} style={{ width: '100%', height: '100%' }} contentFit="contain" nativeControls={false} />
  );
};

/**
 * The Run page result area: pages through generated media, centred in the part
 * the node sheet leaves visible, and opens the full-screen viewer on tap.
 */
export const MediaPreview = memo(function ParallaxMedia({ workflowId, serverId, coverTop }: ParallaxMediaProps) {
  const { generatedMedia, pendingResults, resultsKey } = useGenerationStatus();
  const { setGeneratedMedia } = useGenerationActions();
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const c = useDesign();
  const pagerRef = useRef<PagerView>(null);

  // Results fill their placeholder pages in place, so the page count holds
  // while a run's outputs arrive and the pager never rebuilds under a swipe.
  const pages = useMemo(() => resultPages(generatedMedia, pendingResults), [generatedMedia, pendingResults]);
  const [position, setPosition] = useState<PagerPosition>({ resultsKey, index: 0 });
  const followed = followPage(position, resultsKey, pages.length);
  if (followed !== position) setPosition(followed);
  const activeIndex = followed.index;
  // Stable, and a no-op for the current page: the viewer reports its index from an effect.
  const setActiveIndex = useCallback(
    (index: number) => setPosition((current) => movePage(current, resultsKey, index)),
    [resultsKey],
  );

  const viewerItems = useMemo(() => generatedMedia.map((uri) => toViewerItem(uri)), [generatedMedia]);
  // Results are already saved to the gallery; deleting one removes it there and from this run.
  const deleteResult = async (item: MediaViewerItem) => {
    await deleteGeneratedMedia([item.uri]);
    setGeneratedMedia(generatedMedia.filter((uri) => uri !== item.uri));
  };

  const handlePageSelected = (e: any) => {
    setActiveIndex(e.nativeEvent.position);
  };

  // When modal closes, sync the main pager to the last viewed index
  const handleModalClose = () => {
    pagerRef.current?.setPageWithoutAnimation(activeIndex);
    setIsPreviewOpen(false);
  };

  return (
    <VisibleRegion coverTop={coverTop}>
      {generatedMedia.length > 0 ? (
        <>
          <PagerView
            key={resultsKey}
            ref={pagerRef}
            style={{ flex: 1, width: '100%' }}
            initialPage={0}
            onPageSelected={handlePageSelected}
          >
            {pages.map((page, index) => (
              // Keyed by position: a placeholder becoming its result is a content
              // change, not a page added or removed.
              <View key={`page-${index}`} className="flex-1">
                {page.kind === 'pending' ? (
                  <PendingResultPage position={index + 1} total={pages.length} />
                ) : (
                  <ResultAppear>
                    <Pressable className="flex-1" onPress={() => setIsPreviewOpen(true)}>
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
                        <Image
                          source={{ uri: page.uri }}
                          style={{ width: '100%', height: '100%' }}
                          contentFit="contain"
                          cachePolicy="memory-disk"
                        />
                      )}
                    </Pressable>
                  </ResultAppear>
                )}
              </View>
            ))}
          </PagerView>

          <PageDots pages={pages} activeIndex={activeIndex} />
          <ResultBadges pages={pages} activeIndex={activeIndex} />

          <MediaViewer
            items={viewerItems}
            initialIndex={Math.min(activeIndex, viewerItems.length - 1)}
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
