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
import { useServersStore } from '@/features/server/stores/server-store';
import { buildServerUrl } from '@/services/network';
import { clearNodeSchemaCache, getNodeSchema } from '@/services/node-schema';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { Image } from 'expo-image';
import { Check, Film, ImageOff, WifiOff } from '@/constants/icons';
import React, { forwardRef, useCallback, useEffect, useMemo, useState } from 'react';

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
   * Videos are listed by name: a thumbnail would mean streaming every file in
   * the folder, and the field previews the one that is picked.
   */
  media?: 'image' | 'video';
}

function ImagePreview({ uri, label }: { uri?: string; label: string }) {
  const c = useDesign();
  const [failedImage, setFailedImage] = useState<string>();
  if (!uri || failedImage === uri) {
    return (
      <Box className="h-full w-full items-center justify-center" style={{ backgroundColor: c.well }}>
        <StateIcon icon={ImageOff} size={t.icon.control} />
      </Box>
    );
  }
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
 * (VHS) build their combo the same way, so the same sheet lists videos.
 */
export const ServerImagePicker = forwardRef<BottomSheetModal, ServerImagePickerProps>(function ServerImagePicker(
  { serverId, classType, inputName, value, isVisible, onClose, onSelect, media = 'image' },
  ref,
) {
  const noun = media === 'video' ? 'videos' : 'images';
  const c = useDesign();
  const server = useServersStore((state) => state.servers.find((s) => s.id === serverId));
  // null while we haven't got an answer yet — an empty array is a real answer
  // ("this server has no images") and has to read differently.
  const [files, setFiles] = useState<string[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [viewBase, setViewBase] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

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
    if (isVisible) void load();
  }, [isVisible, load]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      clearNodeSchemaCache(serverId);
      await load();
    } finally {
      setIsRefreshing(false);
    }
  }, [serverId, load]);

  const token = server?.token;
  const options = useMemo<SelectorOption[]>(() => {
    if (!files) return [];
    if (media === 'video') return files.map((filename) => ({ value: filename, label: filename }));
    if (!viewBase) return [];
    return files.map((filename) => {
      const params = new URLSearchParams({
        filename,
        type: 'input',
        subfolder: '',
        preview: 'webp;70',
      });
      if (token) params.append('token', token);
      return {
        value: filename,
        label: filename,
        image: `${viewBase}?${params.toString()}`,
      };
    });
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
            <ImagePreview uri={item.image} label={item.label} />
          </Box>
          <VStack className="p-3">
            <Copy size="body" style={{ fontWeight: '500' }} numberOfLines={2} ellipsizeMode="middle">
              {item.label}
            </Copy>
          </VStack>
        </Box>
      </Pressable>
    ),
    [onSelect, onClose, c],
  );

  const emptyComponent =
    files === null ? (
      <VStack space="sm" className="py-8 flex-1 items-center justify-center">
        <Spinner size="small" className="text-content-tertiary" />
        <Copy muted>Reading the server&apos;s {noun}…</Copy>
      </VStack>
    ) : (
      <VStack space="sm" className="py-8 flex-1 items-center justify-center">
        <StateIcon icon={failed ? WifiOff : media === 'video' ? Film : ImageOff} />
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
      title={media === 'video' ? 'Server Videos' : 'Server Images'}
      options={options}
      value={value}
      searchPlaceholder={`Search ${noun}...`}
      showRefreshButton
      onRefresh={handleRefresh}
      isRefreshing={isRefreshing}
      renderItem={media === 'video' ? undefined : renderItem}
      emptyComponent={emptyComponent}
      numColumns={media === 'video' ? 1 : 2}
    />
  );
});
