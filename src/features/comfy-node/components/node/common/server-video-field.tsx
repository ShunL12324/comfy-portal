import { Action, Copy, StateIcon, useDesign } from '@/components/ui/design-system/primitives';
import { Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { VStack } from '@/components/ui/vstack';
import { designTokens as t, iconStroke } from '@/constants/design-tokens';
import { AlertTriangle, ArrowLeftRight, Film, Play, X } from '@/constants/icons';
import {
  VideoSource,
  describeVideo,
  formatDuration,
  inputFileUrl,
  isUploadCancelled,
  parseVideoInfo,
  previewKindFor,
  readLoadParams,
  videoFieldState,
  videoInfoUrl,
} from '@/features/comfy-node/utils/input-video';
import { MediaViewer } from '@/features/gallery/components/media-viewer';
import { VideoFrame } from '@/features/gallery/components/media-tile';
import { useVideoStill } from '@/features/gallery/hooks/use-video-still';
import { forgetVideoStill } from '@/features/gallery/services/video-thumbnails';
import { MediaBadge } from '@/features/generation/components/media-preview/media-badge';
import { useServersStore } from '@/features/server/stores/server-store';
import { Server } from '@/features/server/types';
import { Node } from '@/features/workflow/types';
import { uploadImage } from '@/services/comfy-api';
import { buildServerUrl, fetchWithAuth } from '@/services/network';
import { NodeSchema, clearNodeSchemaCache } from '@/services/node-schema';
import { showToast } from '@/utils/toast';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import * as DocumentPicker from 'expo-document-picker';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { Platform, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { MediaSource, MediaSourceSheet, MediaSourceSheetRef } from './media-source-sheet';
import { ServerImagePicker } from './server-image-picker';
import SubItem from './sub-item';

interface ServerVideoFieldProps {
  node: Node;
  serverId: string;
  schema: NodeSchema | null;
  /** Combo input holding the filename, e.g. `video`. */
  inputKey: string;
  title: string;
  onChange: (filename: string) => void;
}

interface PickedVideo {
  uri: string;
  name: string;
  mimeType?: string;
}

/** `/view` and `/vhs/queryvideo` on this server, once its scheme is known. */
function useServerEndpoints(server: Server | undefined) {
  const [endpoints, setEndpoints] = useState<{ view: string; query: string } | null>(null);
  useEffect(() => {
    if (!server) return;
    let cancelled = false;
    void Promise.all([
      buildServerUrl(server.useSSL, server.host, server.port, '/view'),
      buildServerUrl(server.useSSL, server.host, server.port, '/vhs/queryvideo'),
    ]).then(([view, query]) => {
      if (!cancelled) setEndpoints({ view, query });
    });
    return () => {
      cancelled = true;
    };
  }, [server]);
  return endpoints;
}

/** Answers per file, so a node scrolled back into view doesn't ask again. */
const videoInfoCache = new Map<string, VideoSource | null>();

/**
 * Duration, rate and size from VideoHelperSuite's own probe. `null` until it
 * answers, and for good on an older VHS without the route.
 */
function useVideoInfo(url: string | undefined, token: string | undefined, revision: number) {
  // The cache holds the answer; this only re-renders once it arrives.
  const [, rerender] = useReducer((count: number) => count + 1, 0);
  useEffect(() => {
    if (!url || videoInfoCache.has(url)) return;
    let cancelled = false;
    fetchWithAuth(url, token)
      .then((response) => (response.status === 200 ? response.json() : null))
      .then(parseVideoInfo, () => null)
      .then((parsed) => {
        videoInfoCache.set(url, parsed);
        if (!cancelled) rerender();
      });
    return () => {
      cancelled = true;
    };
  }, [url, token, revision]);
  return url ? (videoInfoCache.get(url) ?? null) : null;
}

/**
 * The input file of a video loader (VHS), laid out like Load Image's: a
 * 160-point tile, the source sheet, upload progress with cancel, and the
 * missing-file state.
 *
 * On a video a tap means "play it", so the tile previews: it opens the shared
 * full-screen viewer (native controls, no player held in the node list).
 * Changing the file is its own control, Replace, beside the name under the
 * tile; with nothing to play (no file, or a missing one) the tile's tap goes
 * straight to the source sheet instead.
 *
 * The poster is the gallery's cached still frame, made from the file streamed
 * off `/view`; just after an upload it is made from the local copy instead.
 * Videos are sent as-is through `/upload/image`, which stores any file in
 * `input/` (VHS's own upload button uses it the same way).
 */
export default function ServerVideoField({ node, serverId, schema, inputKey, title, onChange }: ServerVideoFieldProps) {
  const c = useDesign();
  const reduceMotion = useReducedMotion();
  const server = useServersStore((state) => state.servers.find((s) => s.id === serverId));
  const endpoints = useServerEndpoints(server);
  const [progress, setProgress] = useState<number | null>(null);
  // The picked file stands in for the server copy right after an upload: a
  // poster from local bytes is instant, and playback needs no round trip.
  const [local, setLocal] = useState<{ filename: string; uri: string } | null>(null);
  const [revision, setRevision] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [isServerPickerVisible, setIsServerPickerVisible] = useState(false);
  const cancelRef = useRef<(() => Promise<void>) | null>(null);
  const sourceSheetRef = useRef<MediaSourceSheetRef>(null);
  const serverPickerRef = useRef<BottomSheetModal>(null);

  const value = node.inputs[inputKey];
  const spec = schema?.inputs[inputKey];
  const state = videoFieldState(value, spec?.kind === 'combo' ? spec.options : undefined, progress);
  const filename = state.kind === 'empty' ? undefined : state.filename;
  const playable = state.kind === 'selected' || (state.kind === 'uploading' && !!filename);
  const previewKind = filename ? previewKindFor(filename, Platform.OS) : 'none';
  const serverUri = endpoints && filename ? inputFileUrl(endpoints.view, filename, server?.token) : undefined;
  const mediaUri = local && local.filename === filename ? local.uri : serverUri;
  const still = useVideoStill(playable && previewKind === 'video' ? mediaUri : undefined);
  const info = useVideoInfo(
    playable && endpoints && filename ? videoInfoUrl(endpoints.query, filename) : undefined,
    server?.token,
    revision,
  );

  const progressWidth = useSharedValue(0);
  useEffect(() => {
    progressWidth.set(withTiming((progress ?? 0) * 100, { duration: reduceMotion ? 0 : t.motion.progress }));
  }, [progress, progressWidth, reduceMotion]);
  const progressStyle = useAnimatedStyle(() => ({ width: `${progressWidth.value}%` }));

  useEffect(() => {
    if (progress !== null) sourceSheetRef.current?.dismiss();
  }, [progress]);

  const upload = async (video: PickedVideo) => {
    setProgress(0);
    progressWidth.set(0);
    try {
      const { promise, cancel } = uploadImage(video.uri, video.name, serverId, video.mimeType, setProgress);
      cancelRef.current = cancel;
      const response = await promise;
      // An upload overwrites a same-named file, so whatever was cached for
      // that name now describes the old bytes.
      if (endpoints) {
        forgetVideoStill(inputFileUrl(endpoints.view, response.name, server?.token));
        videoInfoCache.delete(videoInfoUrl(endpoints.query, response.name));
      }
      setLocal({ filename: response.name, uri: video.uri });
      setRevision((current) => current + 1);
      onChange(response.name);
      // The file list is baked into the node definition; dropping it refetches.
      clearNodeSchemaCache(serverId);
    } catch (error) {
      if (!isUploadCancelled(error)) {
        showToast.error('Error uploading video', error instanceof Error ? error.message : undefined);
      }
    } finally {
      setProgress(null);
      cancelRef.current = null;
    }
  };

  const pickFromLibrary = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showToast.error('Permission to access media library is required', undefined);
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      allowsEditing: false,
      shouldDownloadFromNetwork: true,
    });
    const asset = result.canceled ? undefined : result.assets?.[0];
    if (!asset) return;
    await upload({
      uri: asset.uri,
      name: asset.fileName || asset.uri.split('/').pop() || 'video.mp4',
      mimeType: asset.mimeType,
    });
  };

  const pickFromFiles = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: ['video/*'], copyToCacheDirectory: true });
    const asset = result.canceled ? undefined : result.assets?.[0];
    if (!asset) return;
    await upload({ uri: asset.uri, name: asset.name, mimeType: asset.mimeType ?? undefined });
  };

  const openSourceSheet = () => {
    if (progress === null) sourceSheetRef.current?.present();
  };

  const handleSourcePick = (source: MediaSource) => {
    if (progress !== null) return;
    if (source === 'library') void pickFromLibrary();
    else if (source === 'files') void pickFromFiles();
    else if (source === 'server') setIsServerPickerVisible(true);
  };

  const handleTilePress = () => {
    if (state.kind === 'selected' && previewKind !== 'none' && mediaUri) setViewerOpen(true);
    else openSourceSheet();
  };

  const handleCloseServerPicker = useCallback(() => setIsServerPickerVisible(false), []);
  const handleCloseViewer = useCallback(() => setViewerOpen(false), []);

  if (Array.isArray(value)) {
    // SubItem replaces its children with the "linked to other nodes" note.
    return (
      <SubItem title={title} node={node} dependencies={[inputKey]}>
        <View />
      </SubItem>
    );
  }

  const params = readLoadParams(node.inputs);
  const fill = { width: '100%', height: '100%', borderRadius: t.radius.panel } as const;

  const renderPoster = () => {
    if (previewKind === 'none') {
      return (
        <VStack space="sm" className="px-4 h-full w-full items-center justify-center">
          <StateIcon icon={Film} />
          <Copy size="metadata" muted className="text-center">
            No preview for this format on {Platform.OS === 'ios' ? 'iOS' : 'this device'}
          </Copy>
        </VStack>
      );
    }
    const source = previewKind === 'image' ? mediaUri : still;
    if (previewKind === 'video' && still === null && mediaUri) {
      // The web makes no stills, and a `<video>` shows its own first frame.
      return Platform.OS === 'web' ? (
        <View style={[fill, { overflow: 'hidden' }]}>
          <VideoFrame uri={mediaUri} contentFit="contain" />
        </View>
      ) : (
        <VStack space="sm" className="h-full w-full items-center justify-center">
          <StateIcon icon={Film} />
        </VStack>
      );
    }
    return source ? (
      <Image
        source={{ uri: source }}
        style={fill}
        contentFit="contain"
        transition={reduceMotion ? 0 : t.motion.base}
        cachePolicy="memory-disk"
      />
    ) : null;
  };

  return (
    <SubItem title={title}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          state.kind === 'selected' && previewKind !== 'none' ? `Play ${state.filename}` : 'Choose video'
        }
        accessibilityHint={state.kind === 'selected' && previewKind !== 'none' ? 'Opens full screen' : undefined}
        onPress={handleTilePress}
        style={{ height: t.node.imageHeight }}
        className={`rounded-md relative w-full items-center justify-center ${
          state.kind === 'missing' ? 'border-status-danger/50 bg-well border-[0.5px]' : 'bg-surface-raised'
        }`}
      >
        {state.kind === 'missing' ? (
          <VStack space="sm" className="px-4 h-full w-full items-center justify-center">
            <StateIcon icon={AlertTriangle} color={c.danger} />
            <Copy style={{ fontWeight: '400', color: c.danger }} numberOfLines={1} ellipsizeMode="middle">
              {state.filename}
            </Copy>
            <Copy size="metadata" style={{ color: c.danger }}>
              Not installed on server
            </Copy>
          </VStack>
        ) : playable ? (
          <>
            {renderPoster()}
            {state.kind === 'selected' && previewKind === 'video' ? (
              <View
                pointerEvents="none"
                className="bg-media/50 absolute items-center justify-center rounded-full"
                style={{ width: t.height.touch, height: t.height.touch }}
              >
                <Play size={t.icon.large} color={c.onMedia} fill={c.onMedia} strokeWidth={iconStroke(t.icon.large)} />
              </View>
            ) : null}
            {info ? (
              <View
                pointerEvents="none"
                className="absolute"
                style={{ left: t.layout.related, bottom: t.layout.related }}
              >
                <MediaBadge>{formatDuration(info.duration)}</MediaBadge>
              </View>
            ) : null}
            {state.kind === 'selected' ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Clear video"
                hitSlop={8}
                onPress={(event) => {
                  event.stopPropagation();
                  setLocal(null);
                  onChange('');
                }}
                className="right-2 top-2 bg-media/50 p-1.5 active:opacity-pressed absolute rounded-full"
              >
                <Icon size="sm" as={X} className="text-on-media" />
              </Pressable>
            ) : null}
          </>
        ) : state.kind === 'empty' ? (
          <VStack space="sm" className="h-full w-full items-center justify-center">
            <StateIcon icon={Film} />
            <Copy muted>Choose Video</Copy>
          </VStack>
        ) : null}
        {state.kind === 'uploading' ? (
          <VStack space="sm" className="inset-0 rounded-md bg-media/50 p-4 absolute items-center justify-center">
            <StateIcon icon={Film} color={c.onMedia} />
            <Copy style={{ fontWeight: '400', color: c.onMedia }}>
              Uploading... {Math.round(state.progress * 100)}%
            </Copy>
            <View className="h-1 bg-on-media/30 w-full overflow-hidden rounded-full">
              <Animated.View className="bg-action h-full rounded-full" style={progressStyle} />
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cancel upload"
              hitSlop={4}
              onPress={(event) => {
                event.stopPropagation();
                void cancelRef.current?.();
              }}
              className="mt-2 bg-on-media/20 p-2 active:opacity-pressed rounded-full"
            >
              <Icon size="lg" as={X} className="text-on-media" />
            </Pressable>
          </VStack>
        ) : null}
      </Pressable>

      {playable && filename ? (
        <View className="flex-row items-center" style={{ gap: t.node.inlineGap, marginTop: t.node.labelGap }}>
          <View className="flex-1">
            <Copy numberOfLines={1} ellipsizeMode="middle">
              {filename}
            </Copy>
            {info ? (
              <Copy size="metadata" muted numberOfLines={1}>
                {describeVideo(info, params)}
              </Copy>
            ) : null}
          </View>
          <Action kind="text" small icon={ArrowLeftRight} disabled={progress !== null} onPress={openSourceSheet}>
            Replace
          </Action>
        </View>
      ) : null}

      <MediaSourceSheet
        ref={sourceSheetRef}
        title="Set Video"
        uploads={['library', 'files']}
        onPick={handleSourcePick}
      />

      <ServerImagePicker
        ref={serverPickerRef}
        media="video"
        serverId={serverId}
        classType={node.class_type}
        inputName={inputKey}
        value={typeof value === 'string' ? value : ''}
        isVisible={isServerPickerVisible}
        onClose={handleCloseServerPicker}
        onSelect={onChange}
      />

      {viewerOpen && mediaUri ? (
        <MediaViewer
          items={[{ uri: mediaUri, kind: previewKind === 'image' ? 'image' : 'video' }]}
          initialIndex={0}
          visible
          onClose={handleCloseViewer}
          viewOnly
        />
      ) : null}
    </SubItem>
  );
}
