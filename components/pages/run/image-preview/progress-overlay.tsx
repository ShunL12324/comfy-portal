import { MotiView } from 'moti';
import { memo, useMemo } from 'react';
import { Platform } from 'react-native';

interface ProgressOverlayProps {
  current: number;
  total: number;
}

export const ProgressOverlay = memo(function ProgressOverlay({
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
