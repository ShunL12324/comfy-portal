import { Action, Copy, StateIcon, useDesign } from '@/components/ui/design-system/primitives';
import { Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { VStack } from '@/components/ui/vstack';
import { designTokens as t, iconStroke } from '@/constants/design-tokens';
import { AlertTriangle, ArrowLeftRight, AudioLines, Pause, Play, X } from '@/constants/icons';
import {
  AudioPlayback,
  createAudioPlayback,
  forgetAudioDuration,
  peekAudioDuration,
  probeAudioDuration,
  subscribeAudioDurations,
} from '@/features/comfy-node/services/audio-preview';
import { audioPlayableOn, audioProgress, audioTimeLabel } from '@/features/comfy-node/utils/input-audio';
import { inputFileUrl, videoFieldState } from '@/features/comfy-node/utils/input-video';
import { useServersStore } from '@/features/server/stores/server-store';
import { Node } from '@/features/workflow/types';
import { buildServerUrl } from '@/services/network';
import { NodeSchema } from '@/services/node-schema';
import { showToast } from '@/utils/toast';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import * as DocumentPicker from 'expo-document-picker';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Platform, View } from 'react-native';
import { UploadOverlay, useInputUpload } from './input-upload';
import { MediaSource, MediaSourceSheet, MediaSourceSheetRef } from './media-source-sheet';
import { ServerImagePicker } from './server-image-picker';
import SubItem from './sub-item';

interface ServerAudioFieldProps {
  node: Node;
  serverId: string;
  schema: NodeSchema | null;
  /** Combo input holding the filename, e.g. `audio`. */
  inputKey: string;
  title: string;
  onChange: (filename: string) => void;
}

/** A play control, the time and a progress line, inset by the node's padding. */
const PANEL_HEIGHT = t.height.touch + t.node.inset * 2;

/** `/view` on this server, once its scheme is known. */
function useViewBase(serverId: string) {
  const server = useServersStore((state) => state.servers.find((s) => s.id === serverId));
  const [viewBase, setViewBase] = useState<string | null>(null);
  useEffect(() => {
    if (!server) return;
    let cancelled = false;
    void buildServerUrl(server.useSSL, server.host, server.port, '/view').then((url) => {
      if (!cancelled) setViewBase(url);
    });
    return () => {
      cancelled = true;
    };
  }, [server]);
  return { viewBase, token: server?.token };
}

/** How long a file plays, read once per URL (see `services/audio-preview`). */
function useAudioDuration(uri: string | undefined) {
  const read = useCallback(() => (uri ? peekAudioDuration(uri) : undefined), [uri]);
  const duration = useSyncExternalStore(subscribeAudioDurations, read, read);
  useEffect(() => {
    if (uri && duration === undefined) void probeAudioDuration(uri);
  }, [uri, duration]);
  return duration;
}

/**
 * The input file of an audio loader (core Load Audio), laid out like the
 * video loaders' field: a panel that plays the file, the name with Replace
 * under it, the source sheet (Files or a file already on the server), upload
 * progress with cancel, and the missing-file state.
 *
 * Tapping the panel plays or pauses. The player exists only from the first
 * play until the file changes or the node leaves the screen, and one file
 * plays at a time. The length is read up front by a player that loads the
 * header and is released at once. Files go up through `/upload/image`, as
 * ComfyUI's own audio upload does.
 */
export default function ServerAudioField({ node, serverId, schema, inputKey, title, onChange }: ServerAudioFieldProps) {
  const c = useDesign();
  const { viewBase, token } = useViewBase(serverId);
  // The picked file plays straight from the device right after an upload.
  const [local, setLocal] = useState<{ filename: string; uri: string } | null>(null);
  const [isServerPickerVisible, setIsServerPickerVisible] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState<number | null>(null);
  const playbackRef = useRef<AudioPlayback | null>(null);
  const sourceSheetRef = useRef<MediaSourceSheetRef>(null);
  const serverPickerRef = useRef<BottomSheetModal>(null);
  const { progress, progressStyle, upload, cancel } = useInputUpload(
    serverId,
    'Error uploading audio',
    (name, file) => {
      // An upload overwrites a same-named file; its length may have changed.
      if (viewBase) forgetAudioDuration(inputFileUrl(viewBase, name, token));
      setLocal({ filename: name, uri: file.uri });
      onChange(name);
    },
  );

  const value = node.inputs[inputKey];
  const spec = schema?.inputs[inputKey];
  // Load Audio's combo is `input/` filtered by content type, as for videos.
  const state = videoFieldState(value, spec?.kind === 'combo' ? spec.options : undefined, progress);
  const filename = state.kind === 'empty' ? undefined : state.filename;
  const hasFile = state.kind === 'selected' || (state.kind === 'uploading' && !!filename);
  const playable = !!filename && audioPlayableOn(filename, Platform.OS);
  const serverUri = viewBase && filename ? inputFileUrl(viewBase, filename, token) : undefined;
  const mediaUri = local && local.filename === filename ? local.uri : serverUri;
  const duration = useAudioDuration(hasFile && playable ? mediaUri : undefined);

  // A new file, or leaving the screen, ends playback of the old one.
  useEffect(
    () => () => {
      playbackRef.current?.release();
      playbackRef.current = null;
      setPlaying(false);
      setPosition(null);
    },
    [mediaUri],
  );

  useEffect(() => {
    if (progress !== null) sourceSheetRef.current?.dismiss();
  }, [progress]);

  const togglePlayback = () => {
    if (!mediaUri) return;
    if (!playbackRef.current) {
      playbackRef.current = createAudioPlayback(mediaUri, {
        onTime: setPosition,
        onPlaying: setPlaying,
        onEnd: () => setPlaying(false),
        onError: () => {
          playbackRef.current?.release();
          playbackRef.current = null;
          setPlaying(false);
          setPosition(null);
          showToast.error('Could not play this file', undefined);
        },
      });
    }
    if (playing) playbackRef.current.pause();
    else playbackRef.current.play();
  };

  const pickFromFiles = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: ['audio/*'], copyToCacheDirectory: true });
    const asset = result.canceled ? undefined : result.assets?.[0];
    if (!asset) return;
    await upload({ uri: asset.uri, name: asset.name, mimeType: asset.mimeType ?? undefined });
  };

  const openSourceSheet = () => {
    if (progress === null) sourceSheetRef.current?.present();
  };

  const handleSourcePick = (source: MediaSource) => {
    if (progress !== null) return;
    if (source === 'files') void pickFromFiles();
    else if (source === 'server') setIsServerPickerVisible(true);
  };

  const handlePanelPress = () => {
    if (state.kind === 'selected' && playable && mediaUri) togglePlayback();
    else if (state.kind !== 'selected') openSourceSheet();
  };

  const handleCloseServerPicker = useCallback(() => setIsServerPickerVisible(false), []);

  if (Array.isArray(value)) {
    // SubItem replaces its children with the "linked to other nodes" note.
    return (
      <SubItem title={title} node={node} dependencies={[inputKey]}>
        <View />
      </SubItem>
    );
  }

  const canPlay = state.kind === 'selected' && playable;
  const time = audioTimeLabel(position, duration);
  const fraction = audioProgress(position, duration);

  const renderPlayer = () => (
    <View
      className="h-full w-full flex-row items-center"
      style={{ gap: t.node.inlineGap, paddingHorizontal: t.node.inset }}
    >
      <View
        pointerEvents="none"
        className={`items-center justify-center rounded-full ${canPlay ? 'bg-tint' : 'bg-well'}`}
        style={{ width: t.height.touch, height: t.height.touch }}
      >
        {canPlay ? (
          playing ? (
            <Pause size={t.icon.large} color={c.onTint} fill={c.onTint} strokeWidth={iconStroke(t.icon.large)} />
          ) : (
            <Play size={t.icon.large} color={c.onTint} fill={c.onTint} strokeWidth={iconStroke(t.icon.large)} />
          )
        ) : (
          <StateIcon icon={AudioLines} />
        )}
      </View>
      <VStack className="flex-1" style={{ gap: t.node.labelGap }}>
        {playable ? (
          <>
            <Copy size="metadata" mono muted numberOfLines={1}>
              {time || ' '}
            </Copy>
            <View className="h-1 w-full overflow-hidden rounded-full" style={{ backgroundColor: c.line }}>
              <View className="bg-action h-full rounded-full" style={{ width: `${fraction * 100}%` }} />
            </View>
          </>
        ) : (
          <Copy size="metadata" muted numberOfLines={2}>
            No playback for this format on {Platform.OS === 'ios' ? 'iOS' : 'this device'}
          </Copy>
        )}
      </VStack>
      {state.kind === 'selected' ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Clear audio"
          hitSlop={8}
          onPress={(event) => {
            event.stopPropagation();
            setLocal(null);
            onChange('');
          }}
          className="p-1.5 active:opacity-pressed rounded-full"
        >
          <Icon size="sm" as={X} className="text-content-tertiary" />
        </Pressable>
      ) : null}
    </View>
  );

  return (
    <SubItem title={title}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          canPlay
            ? `${playing ? 'Pause' : 'Play'} ${state.filename}`
            : state.kind === 'selected'
              ? undefined
              : 'Choose audio'
        }
        disabled={state.kind === 'selected' && !playable}
        onPress={handlePanelPress}
        style={{ height: PANEL_HEIGHT }}
        className={`rounded-md relative w-full items-center justify-center ${
          state.kind === 'missing' ? 'border-status-danger/50 bg-well border-[0.5px]' : 'bg-surface-raised'
        }`}
      >
        {state.kind === 'missing' ? (
          <View
            className="h-full w-full flex-row items-center"
            style={{ gap: t.node.inlineGap, paddingHorizontal: t.node.inset }}
          >
            <StateIcon icon={AlertTriangle} color={c.danger} />
            <VStack className="flex-1">
              <Copy style={{ fontWeight: '400', color: c.danger }} numberOfLines={1} ellipsizeMode="middle">
                {state.filename}
              </Copy>
              <Copy size="metadata" style={{ color: c.danger }}>
                Not installed on server
              </Copy>
            </VStack>
          </View>
        ) : hasFile ? (
          renderPlayer()
        ) : state.kind === 'empty' ? (
          <View className="flex-row items-center" style={{ gap: t.node.inlineGap }}>
            <StateIcon icon={AudioLines} />
            <Copy muted>Choose Audio</Copy>
          </View>
        ) : null}
        {state.kind === 'uploading' ? (
          <UploadOverlay
            icon={AudioLines}
            progress={state.progress}
            progressStyle={progressStyle}
            onCancel={cancel}
            compact
          />
        ) : null}
      </Pressable>

      {hasFile && filename ? (
        <View className="flex-row items-center" style={{ gap: t.node.inlineGap, marginTop: t.node.labelGap }}>
          <Copy className="flex-1" numberOfLines={1} ellipsizeMode="middle">
            {filename}
          </Copy>
          <Action kind="text" small icon={ArrowLeftRight} disabled={progress !== null} onPress={openSourceSheet}>
            Replace
          </Action>
        </View>
      ) : null}

      <MediaSourceSheet ref={sourceSheetRef} title="Set Audio" uploads={['files']} onPick={handleSourcePick} />

      <ServerImagePicker
        ref={serverPickerRef}
        media="audio"
        serverId={serverId}
        classType={node.class_type}
        inputName={inputKey}
        value={typeof value === 'string' ? value : ''}
        isVisible={isServerPickerVisible}
        onClose={handleCloseServerPicker}
        onSelect={onChange}
      />
    </SubItem>
  );
}
