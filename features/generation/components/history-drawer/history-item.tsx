import { Box } from '@/components/ui/box';
import { Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Check, PlayCircle } from 'lucide-react-native';
import React, { useCallback } from 'react';
import { View } from 'react-native';

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
      className={`absolute right-1.5 bottom-1.5 h-5 w-5 rounded-full items-center justify-center ${
        isSelected ? 'bg-success-400' : 'bg-black/30 border border-white/60'
      }`}
    >
      {isSelected && <Icon as={Check} size="2xs" className="text-white" />}
    </View>
  );
}

/** Lightweight image-only thumbnail — no video player overhead. */
function ImageItem({ url, index, isSelectionMode, isSelected, onPress, onLongPress }: HistoryItemProps) {
  const handlePress = useCallback(() => onPress(url), [onPress, url]);
  const handleLongPress = useCallback(() => onLongPress(url), [onLongPress, url]);

  return (
    <Pressable onPress={handlePress} onLongPress={handleLongPress} className="relative">
      <Box className="aspect-square overflow-hidden rounded-lg bg-background-100">
        <Image
          source={url}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
          cachePolicy="memory-disk"
          recyclingKey={url}
        />
      </Box>
      {isSelected && (
        <View className="absolute inset-0 rounded-lg border-2 border-success-400" />
      )}
      {isSelectionMode && <SelectionIndicator isSelected={isSelected} />}
    </Pressable>
  );
}

/** Video thumbnail with native player — only mounted for actual video files. */
function VideoItem({ url, index, isSelectionMode, isSelected, onPress, onLongPress }: HistoryItemProps) {
  const player = useVideoPlayer(url, p => {
    p.loop = false;
    p.pause();
    p.muted = true;
  });

  const handlePress = useCallback(() => onPress(url), [onPress, url]);
  const handleLongPress = useCallback(() => onLongPress(url), [onLongPress, url]);

  return (
    <Pressable onPress={handlePress} onLongPress={handleLongPress} className="relative">
      <Box className="aspect-square overflow-hidden rounded-lg bg-background-100">
        <VideoView
          player={player}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
          nativeControls={false}
        />
        <View className="absolute inset-0 items-center justify-center bg-black/20">
          <Icon as={PlayCircle} className="text-white opacity-90 h-8 w-8" />
        </View>
      </Box>
      {isSelected && (
        <View className="absolute inset-0 rounded-lg border-2 border-success-400" />
      )}
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
  (prev, next) => (
    prev.url === next.url &&
    prev.isSelectionMode === next.isSelectionMode &&
    prev.isSelected === next.isSelected
  ),
);
