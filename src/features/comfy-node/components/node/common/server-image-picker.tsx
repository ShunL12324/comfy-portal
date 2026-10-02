import { SearchableBottomSheet } from '@/components/common/selectors/bottom-sheet';
import { getOptionSurfaceStyle } from '@/components/common/selectors/bottom-sheet/item';
import { designTokens as t } from '@/constants/design-tokens';
import { SelectorOption } from '@/components/common/selectors/types';
import { View as Box } from '@/components/ui/view';
import { Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { Spinner } from '@/components/ui/spinner';
import { Copy, StateIcon, useDesign } from '@/components/ui/design-system/primitives';
import { VStack } from '@/components/ui/vstack';
import { inputFileUrl, inputFileVersion, inputStillKey, previewKindFor } from '@/features/comfy-node/utils/input-video';
import { VisibleRows, createVisibleRows } from '@/features/comfy-node/utils/visible-rows';
import { useVideoStill } from '@/features/gallery/hooks/use-video-still';
import { useServersStore } from '@/features/server/stores/server-store';
import { buildServerUrl, fetchWithAuth } from '@/services/network';
import { clearNodeSchemaCache, getNodeSchema } from '@/services/node-schema';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { Image } from 'expo-image';
import { AudioLines, Check, Film, ImageOff, WifiOff, type LucideIcon } from '@/constants/icons';
import React, { forwardRef, useCallback, useEffect, useMemo, useReducer, useState, useSyncExternalStore } from 'react';
import { Platform, ViewToken } from 'react-native';

interface ServerImagePickerProps {
  serverId: string;
  /** Node class the input belongs to, e.g. `LoadImage`. */
  classType: string;
  /** Combo input holding the filename, e.g. `image`. */
  inputName: string;
  /** Currently selected filename, so it can be marked in the grid. */
  value: string;
  isVisible: boolean;
  onClose: () => void;
  onSelect: (filename: string) => void;
  /**
   * Videos get a poster frame, made only for the tiles on screen (see
   * `VideoPreview`); audio files have nothing to show, so they are listed by name.
   */
  media?: 'image' | 'video' | 'audio';
}

/** `/view?preview=`: re-encoded server-side by PIL, so stills and GIFs only. */
function previewUrl(viewBase: string, filename: string, token: string | undefined): string {
  const params = new URLSearchParams({ filename, type: 'input', subfolder: '', preview: 'webp;70' });
  if (token) params.append('token', token);
  return `${viewBase}?${params.toString()}`;
}

function TileGlyph({ icon }: { icon: LucideIcon }) {
  const c = useDesign();
  return (
    <Box className="h-full w-full items-center justify-center" style={{ backgroundColor: c.well }}>
      <StateIcon icon={icon} size={t.icon.control} />
    </Box>
  );
}

function ImagePreview({ uri, label, fallback = ImageOff }: { uri?: string; label: string; fallback?: LucideIcon }) {
  const [failedImage, setFailedImage] = useState<string>();
  if (!uri || failedImage === uri) return <TileGlyph icon={fallback} />;
  return (
    <Image
      source={{ uri }}
      alt={label}
      style={{ height: '100%', width: '100%' }}
      contentFit="cover"
      cachePolicy="memory-disk"
      transition={150}
      onError={() => setFailedImage(uri)}
    />
  );
}

/** Server file versions (`HEAD /view`) for the open sheet; cleared each time it opens or refreshes. */
const fileVersions = new Map<string, string | null>();

/**
 * The version of an input file (size and modification time), asked with a
 * `HEAD` so no bytes are sent. `undefined` until it answers; `null` when the
 * server sends neither header or refuses the request. Abandoned when the row
 * leaves the screen.
 */
function useFileVersion(url: string | undefined, token: string | undefined) {
  const [, rerender] = useReducer((count: number) => count + 1, 0);
  useEffect(() => {
    if (!url || fileVersions.has(url)) return;
    const controller = new AbortController();
    fetchWithAuth(url, token, { method: 'HEAD', signal: controller.signal })
      .then(
        (response) => (response.ok ? inputFileVersion(response.headers) : null),
        // Aborted or offline: asked again the next time the row shows.
        () => undefined,
      )
      .then((version) => {
        if (version === undefined || controller.signal.aborted) return;
        fileVersions.set(url, version);
        rerender();
      });
    return () => controller.abort();
  }, [url, token]);
  return url && fileVersions.has(url) ? fileVersions.get(url) : undefined;
}

interface VideoPreviewProps {
  viewBase: string;
  filename: string;
  token: string | undefined;
  rows: VisibleRows;
}

/**
 * A server video's tile: its first frame, made by the gallery's still service
 * from the file on `/view`. The player asks for byte ranges, so only the
 * header and the first keyframe come over, not the whole file. Only a tile on
 * screen asks (one `HEAD` for the file's version, then its turn in the still
 * queue, two at a time), and a tile that leaves the screen before its turn
 * gives the request up. Stills are cached on disk under URL + size + mtime:
 * an overwritten file gets a new one, and a reopened sheet shows the old ones
 * at once.
 *
 * VHS's `/vhs/viewvideo` can cut a single frame server-side, but answers with
 * VP9 WebM, which iOS cannot decode; `/view`'s `preview` only reads stills.
 * GIFs are stills to `/view`, so they take the image route. Formats this
 * device cannot play, and the web (no still cache), show the video glyph.
 */
function VideoPreview({ viewBase, filename, token, rows }: VideoPreviewProps) {
  const kind = previewKindFor(filename, Platform.OS);
  const onScreen = useSyncExternalStore(
    rows.subscribe,
    () => rows.has(filename),
    () => false,
  );
  const wantsStill = kind === 'video' && Platform.OS !== 'web';
  const version = useFileVersion(wantsStill && onScreen ? inputFileUrl(viewBase, filename) : undefined, token);
  const key = version === undefined ? undefined : inputStillKey(viewBase, filename, version);
  // Asked for only on screen; once made, a still stays shown off screen too.
  const still = useVideoStill(key && onScreen ? inputFileUrl(viewBase, filename, token) : undefined, key);
  if (kind === 'image')
    return <ImagePreview uri={previewUrl(viewBase, filename, token)} label={filename} fallback={Film} />;
  return typeof still === 'string' ? (
    <ImagePreview uri={still} label={filename} fallback={Film} />
  ) : (
    <TileGlyph icon={Film} />
  );
}

/** On screen once a tenth of it shows for a moment, so a fling past doesn't count. */
const VIEWABILITY = { itemVisiblePercentThreshold: 10, minimumViewTime: 150 };

const NOUNS = { image: 'images', video: 'videos', audio: 'audio files' } as const;
const TITLES = { image: 'Server Images', video: 'Server Videos', audio: 'Server Audio' } as const;

/**
 * Picks an image that is already in ComfyUI's `input/` directory.
 *
 * The list is the node's own combo options: `LoadImage.INPUT_TYPES` builds them
 * by listing `input/` and filtering to image content types, so `/object_info/
 * LoadImage` is an exact, always-current inventory of what the node will accept
 * — including files put there by other clients, or ones this app uploaded on a
 * previous run. Without this the only way to fill the input is to upload again,
 * which re-sends an image the server already has.
 *
 * Thumbnails go through `/view`'s `preview` parameter, which re-encodes
 * server-side: a 2.6 MB source comes back as a ~40 KB webp. Video loaders
 * (VHS, core Load Video) build their combo the same way, so the same sheet
 * lists videos, in the same tiles, with poster frames (see `VideoPreview`).
 */
export const ServerImagePicker = forwardRef<BottomSheetModal, ServerImagePickerProps>(function ServerImagePicker(
  { serverId, classType, inputName, value, isVisible, onClose, onSelect, media = 'image' },
  ref,
) {
  const noun = NOUNS[media];
  const c = useDesign();
  const server = useServersStore((state) => state.servers.find((s) => s.id === serverId));
  // null while we haven't got an answer yet — an empty array is a real answer
  // ("this server has no images") and has to read differently.
  const [files, setFiles] = useState<string[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [viewBase, setViewBase] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [rows] = useState(createVisibleRows);
  // The list requires the same handler for its whole life.
  const [handleViewableItemsChanged] = useState(
    () =>
      ({ viewableItems }: { viewableItems: ViewToken<SelectorOption>[] }) =>
        rows.update(viewableItems.map((token) => token.item.value)),
  );

  useEffect(() => {
    if (!server) return;
    let cancelled = false;
    buildServerUrl(server.useSSL, server.host, server.port, '/view').then((url) => {
      if (!cancelled) setViewBase(url);
    });
    return () => {
      cancelled = true;
    };
  }, [server]);

  const load = useCallback(
    () =>
      getNodeSchema(serverId, classType).then(
        (schema) => {
          const spec = schema?.inputs[inputName];
          setFiles(spec?.kind === 'combo' ? spec.options : []);
          setFailed(false);
        },
        () => {
          // Offline and an empty inventory need different recovery guidance.
          setFiles([]);
          setFailed(true);
        },
      ),
    [serverId, classType, inputName],
  );

  // Only when the sheet opens: this is a network call, and the node renders
  // in a long list where most inputs are never touched.
  useEffect(() => {
    if (!isVisible) return;
    fileVersions.clear();
    void load();
  }, [isVisible, load]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      clearNodeSchemaCache(serverId);
      fileVersions.clear();
      await load();
    } finally {
      setIsRefreshing(false);
    }
  }, [serverId, load]);

  const token = server?.token;
  const options = useMemo<SelectorOption[]>(() => {
    if (!files || !viewBase) return [];
    return files.map((filename) => ({
      value: filename,
      label: filename,
      image: media === 'image' ? previewUrl(viewBase, filename, token) : undefined,
    }));
  }, [files, viewBase, token, media]);

  // The default text row only reports the choice; the sheet closes here.
  const handleSelect = useCallback(
    (filename: string) => {
      onSelect(filename);
      onClose();
    },
    [onSelect, onClose],
  );

  const renderItem = useCallback(
    (item: SelectorOption, isSelected: boolean) => (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={item.label}
        accessibilityState={{ selected: isSelected }}
        aria-pressed={isSelected}
        onPress={() => {
          onSelect(item.value);
          onClose();
        }}
        className="active:opacity-pressed w-full"
      >
        <Box
          testID={`selector-option-${item.value}`}
          className="relative overflow-hidden"
          style={getOptionSurfaceStyle(c, isSelected, true)}
        >
          {isSelected && (
            <Box className="right-2 top-2 p-1 absolute z-10 rounded-full" style={{ backgroundColor: c.tint }}>
              <Icon as={Check} size="sm" style={{ color: c.onTint }} />
            </Box>
          )}
          <Box className="aspect-square w-full overflow-hidden border-b" style={{ borderColor: c.line }}>
            {media === 'video' && viewBase ? (
              <VideoPreview viewBase={viewBase} filename={item.value} token={token} rows={rows} />
            ) : (
              <ImagePreview uri={item.image} label={item.label} />
            )}
          </Box>
          <VStack className="p-3">
            <Copy size="body" style={{ fontWeight: '500' }} numberOfLines={2} ellipsizeMode="middle">
              {item.label}
            </Copy>
          </VStack>
        </Box>
      </Pressable>
    ),
    [onSelect, onClose, c, media, viewBase, token, rows],
  );

  const emptyComponent =
    files === null ? (
      <VStack space="sm" className="py-8 flex-1 items-center justify-center">
        <Spinner size="small" className="text-content-tertiary" />
        <Copy muted>Reading the server&apos;s {noun}…</Copy>
      </VStack>
    ) : (
      <VStack space="sm" className="py-8 flex-1 items-center justify-center">
        <StateIcon icon={failed ? WifiOff : media === 'video' ? Film : media === 'audio' ? AudioLines : ImageOff} />
        <Copy muted className="text-center">
          {failed
            ? `Could not reach the server to read its ${noun}. Check that it is online, then refresh.`
            : `No ${noun} in this server’s input folder yet. Anything you upload shows up here afterwards.`}
        </Copy>
      </VStack>
    );

  return (
    <SearchableBottomSheet
      ref={ref}
      isVisible={isVisible}
      onClose={onClose}
      onSelect={handleSelect}
      title={TITLES[media]}
      options={options}
      value={value}
      searchPlaceholder={`Search ${noun}...`}
      showRefreshButton
      onRefresh={handleRefresh}
      isRefreshing={isRefreshing}
      renderItem={media === 'audio' ? undefined : renderItem}
      emptyComponent={emptyComponent}
      numColumns={media === 'audio' ? 1 : 2}
      onViewableItemsChanged={handleViewableItemsChanged}
      viewabilityConfig={VIEWABILITY}
    />
  );
});
