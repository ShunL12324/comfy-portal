import { Box } from '@/components/ui/box';
import { Center } from '@/components/ui/center';
import { Image } from '@/components/ui/image';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { MotiView } from 'moti';
import { memo, useMemo } from 'react';
import { Platform } from 'react-native';

interface ProgressOverlayProps {
  current: number;
  total: number;
}

const ProgressOverlay = memo(function ProgressOverlay({
  current,
  total,
}: ProgressOverlayProps) {
  const progressPercentage = useMemo(
    () => Math.round((current / total) * 100),
    [current, total],
  );

  const animationConfig = Platform.select({
    ios: {
      type: 'timing' as const,
      duration: 300,
    },
    android: {
      type: 'timing' as const,
      duration: 200,
    },
  });

  return (
    <MotiView
      className="absolute bottom-0 h-full bg-black/50 backdrop-blur-sm"
      animate={{
        width: `${progressPercentage}%`,
      }}
      transition={animationConfig}
    />
  );
});

interface ImagePreviewProps {
  imageUrl?: string;
  progress?: {
    current: number;
    total: number;
  };
}

export const ImagePreview = memo(function ImagePreview({
  imageUrl,
  progress,
}: ImagePreviewProps) {
  return (
    <Box className="relative h-full w-full overflow-hidden border-[0.5px] border-neutral-200 dark:border-neutral-800">
      {imageUrl ? (
        <Center className="h-full">
          <Image
            source={{ uri: imageUrl }}
            alt="Generated image"
            className="h-full w-full"
            resizeMode="contain"
          />
        </Center>
      ) : (
        <Center className="h-full w-full bg-neutral-100 dark:bg-neutral-900">
          <VStack space="sm">
            <Text className="text-neutral-500">No image generated yet</Text>
            {progress && progress.current > 0 && (
              <Text className="text-neutral-500">
                {Math.round((progress.current / progress.total) * 100)}%
              </Text>
            )}
          </VStack>
        </Center>
      )}

      {progress &&
        progress.current > 0 &&
        progress.current < progress.total && (
          <ProgressOverlay current={progress.current} total={progress.total} />
        )}
    </Box>
  );
});
