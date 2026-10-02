import { Copy, StateIcon, useDesign } from '@/components/ui/design-system/primitives';
import { Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { VStack } from '@/components/ui/vstack';
import { designTokens as t } from '@/constants/design-tokens';
import { type LucideIcon, X } from '@/constants/icons';
import { isUploadCancelled } from '@/features/comfy-node/utils/input-video';
import { uploadImage } from '@/services/comfy-api';
import { clearNodeSchemaCache } from '@/services/node-schema';
import { showToast } from '@/utils/toast';
import { useEffect, useRef, useState } from 'react';
import { View, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';

export interface PickedFile {
  uri: string;
  name: string;
  mimeType?: string;
}

/**
 * Sends a picked file to the server's `input/` folder, the way the media
 * loaders' fields do: `/upload/image` stores any file there (ComfyUI's own
 * frontend uploads audio and video through it too), with progress and cancel.
 * Once stored, the node definition is dropped so its file list refetches.
 * `progress` is `null` while nothing is in flight.
 */
export function useInputUpload(
  serverId: string,
  errorTitle: string,
  onUploaded: (name: string, file: PickedFile) => void,
) {
  const reduceMotion = useReducedMotion();
  const [progress, setProgress] = useState<number | null>(null);
  const cancelRef = useRef<(() => Promise<void>) | null>(null);

  const progressWidth = useSharedValue(0);
  useEffect(() => {
    progressWidth.set(withTiming((progress ?? 0) * 100, { duration: reduceMotion ? 0 : t.motion.progress }));
  }, [progress, progressWidth, reduceMotion]);
  const progressStyle = useAnimatedStyle((): ViewStyle => ({ width: `${progressWidth.value}%` }));

  const upload = async (file: PickedFile) => {
    setProgress(0);
    progressWidth.set(0);
    try {
      const { promise, cancel } = uploadImage(file.uri, file.name, serverId, file.mimeType, setProgress);
      cancelRef.current = cancel;
      const response = await promise;
      onUploaded(response.name, file);
      clearNodeSchemaCache(serverId);
    } catch (error) {
      if (!isUploadCancelled(error)) {
        showToast.error(errorTitle, error instanceof Error ? error.message : undefined);
      }
    } finally {
      setProgress(null);
      cancelRef.current = null;
    }
  };

  const cancel = () => void cancelRef.current?.();

  return { progress, progressStyle, upload, cancel };
}

interface UploadOverlayProps {
  icon: LucideIcon;
  progress: number;
  progressStyle: ReturnType<typeof useInputUpload>['progressStyle'];
  onCancel: () => void;
  /** A short tile lays the parts out in a row. */
  compact?: boolean;
}

/** The scrim over a media field while its file uploads: percentage, bar and cancel. */
export function UploadOverlay({ icon, progress, progressStyle, onCancel, compact }: UploadOverlayProps) {
  const c = useDesign();
  const bar = (
    <View className="h-1 bg-on-media/30 w-full overflow-hidden rounded-full">
      <Animated.View className="bg-action h-full rounded-full" style={progressStyle} />
    </View>
  );
  const cancel = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Cancel upload"
      hitSlop={4}
      onPress={(event) => {
        event.stopPropagation();
        onCancel();
      }}
      className={`${compact ? '' : 'mt-2'}bg-on-media/20 p-2 active:opacity-pressed rounded-full`}
    >
      <Icon size="lg" as={X} className="text-on-media" />
    </Pressable>
  );
  const label = <Copy style={{ fontWeight: '400', color: c.onMedia }}>Uploading... {Math.round(progress * 100)}%</Copy>;
  if (compact) {
    return (
      <View
        className="inset-0 rounded-md bg-media/50 absolute flex-row items-center"
        style={{ gap: t.node.inlineGap, paddingHorizontal: t.node.inset }}
      >
        <StateIcon icon={icon} color={c.onMedia} />
        <VStack className="flex-1" style={{ gap: t.node.labelGap }}>
          {label}
          {bar}
        </VStack>
        {cancel}
      </View>
    );
  }
  return (
    <VStack space="sm" className="inset-0 rounded-md bg-media/50 p-4 absolute items-center justify-center">
      <StateIcon icon={icon} color={c.onMedia} />
      {label}
      {bar}
      {cancel}
    </VStack>
  );
}
