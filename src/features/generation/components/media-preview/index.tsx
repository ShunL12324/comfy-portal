import { useDesign } from '@/components/ui/design-system/primitives';
import { Image } from 'expo-image';
import { PlayCircle } from '@/constants/icons';
import React, { memo, useMemo, useRef, useState } from 'react';
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
import { MediaBadge } from './media-badge';
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
  const { generatedMedia } = useGenerationStatus();
  const { setGeneratedMedia } = useGenerationActions();
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const c = useDesign();
  const pagerRef = useRef<PagerView>(null);

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
                    <Image
                      source={{ uri: mediaUrl }}
                      style={{ width: '100%', height: '100%' }}
                      contentFit="contain"
                      cachePolicy="memory-disk"
                    />
                  )}
                </Pressable>
              </View>
            ))}
          </PagerView>

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
