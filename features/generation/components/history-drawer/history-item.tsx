import { Box } from '@/components/ui/box';
import { Icon } from '@/components/ui/icon';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Check, PlayCircle } from '@/constants/icons';
import React, { useCallback } from 'react';
import { Pressable, View } from 'react-native';

interface HistoryItemProps {
  url: string;
  index: number;
  isSelectionMode: boolean;
  isSelected: boolean;
  onPress: (url: string) => void;
  onLongPress: (url: string) => void;
}

function SelectionIndicator({ isSelected }: { isSelected: boolean }) {
  return (
    <View
      className={`right-1.5 bottom-1.5 h-5 w-5 absolute items-center justify-center rounded-full ${
        isSelected ? 'bg-ink' : 'bg-media/20 border-on-media/40 border'
      }`}
    >
      {isSelected && <Icon as={Check} size="xs" className="text-content-inverse" />}
    </View>
  );
}

function ImageItem({ url, isSelectionMode, isSelected, onPress, onLongPress }: HistoryItemProps) {
  const handlePress = useCallback(() => onPress(url), [onPress, url]);
  const handleLongPress = useCallback(() => onLongPress(url), [onLongPress, url]);

  return (
    <Pressable onPress={handlePress} onLongPress={handleLongPress} className="relative">
      <Box className="bg-surface-sunken aspect-square overflow-hidden">
        <Image
          source={url}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
          cachePolicy="memory-disk"
          recyclingKey={url}
        />
      </Box>
      {isSelected && <View className="inset-0 border-ink absolute border-[3px]" />}
      {isSelectionMode && <SelectionIndicator isSelected={isSelected} />}
    </Pressable>
  );
}

function VideoItem({ url, isSelectionMode, isSelected, onPress, onLongPress }: HistoryItemProps) {
  const player = useVideoPlayer(url, (p) => {
    p.loop = false;
    p.pause();
    p.muted = true;
  });

  const handlePress = useCallback(() => onPress(url), [onPress, url]);
  const handleLongPress = useCallback(() => onLongPress(url), [onLongPress, url]);

  return (
    <Pressable onPress={handlePress} onLongPress={handleLongPress} className="relative">
      <Box className="bg-surface-sunken aspect-square overflow-hidden">
        <VideoView
          player={player}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
          nativeControls={false}
        />
        <View className="inset-0 bg-media/20 absolute items-center justify-center">
          <Icon size="display" as={PlayCircle} className="text-on-media" />
        </View>
      </Box>
      {isSelected && <View className="inset-0 border-ink absolute border-[3px]" />}
      {isSelectionMode && <SelectionIndicator isSelected={isSelected} />}
    </Pressable>
  );
}

const VIDEO_EXTENSIONS = new Set(['mp4', 'mov', 'm4v', 'webm']);

export const HistoryItem = React.memo(
  function HistoryItem(props: HistoryItemProps) {
    const ext = props.url.split('.').pop()?.toLowerCase() ?? '';
    if (VIDEO_EXTENSIONS.has(ext)) {
      return <VideoItem {...props} />;
    }
    return <ImageItem {...props} />;
  },
  (prev, next) =>
    prev.url === next.url && prev.isSelectionMode === next.isSelectionMode && prev.isSelected === next.isSelected,
);
