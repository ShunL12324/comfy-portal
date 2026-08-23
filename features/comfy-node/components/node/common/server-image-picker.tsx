import { SearchableBottomSheet } from '@/components/common/selectors/bottom-sheet';
import { SelectorOption } from '@/components/common/selectors/types';
import { Box } from '@/components/ui/box';
import { Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { useServersStore } from '@/features/server/stores/server-store';
import { buildServerUrl } from '@/services/network';
import { clearNodeSchemaCache, getNodeSchema } from '@/services/node-schema';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { Image } from 'expo-image';
import { Check, ImageOff, WifiOff } from 'lucide-react-native';
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
 * server-side: a 2.6 MB source comes back as a ~40 KB webp.
 */
export const ServerImagePicker = forwardRef<BottomSheetModal, ServerImagePickerProps>(
  function ServerImagePicker(
    { serverId, classType, inputName, value, isVisible, onClose, onSelect },
    ref,
  ) {
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

    const load = useCallback(async () => {
      try {
        const schema = await getNodeSchema(serverId, classType);
        const spec = schema?.inputs[inputName];
        setFiles(spec?.kind === 'combo' ? spec.options : []);
        setFailed(false);
      } catch {
        // Kept apart from the empty case: "the server has no images" and "we
        // couldn't ask the server" send the user looking in different places.
        setFiles([]);
        setFailed(true);
      }
    }, [serverId, classType, inputName]);

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

    const options = useMemo<SelectorOption[]>(() => {
      if (!files || !viewBase) return [];
      return files.map((filename) => {
        const params = new URLSearchParams({
          filename,
          type: 'input',
          subfolder: '',
          preview: 'webp;70',
        });
        if (server?.token) params.append('token', server.token);
        return {
          value: filename,
          label: filename,
          image: `${viewBase}?${params.toString()}`,
        };
      });
    }, [files, viewBase, server?.token]);

    const renderItem = useCallback(
      (item: SelectorOption, isSelected: boolean) => (
        <Pressable
          onPress={() => {
            onSelect(item.value);
            onClose();
          }}
          className="w-[48.5%] active:opacity-80"
        >
          <Box
            className={`relative overflow-hidden rounded-xl ${
              isSelected ? 'border-[3px] border-outline-400' : 'bg-background-200'
            }`}
          >
            {isSelected && (
              <Box className="absolute right-2 top-2 z-10 rounded-full bg-background-50 p-1">
                <Icon as={Check} size="sm" className="text-typography-950" />
              </Box>
            )}
            <Box className="aspect-square w-full overflow-hidden border-b-[0.5px] border-background-100">
              <Image
                source={{ uri: item.image }}
                alt={item.label}
                style={{ height: '100%', width: '100%' }}
                contentFit="cover"
                cachePolicy="memory-disk"
                transition={150}
              />
            </Box>
            <VStack className="p-3">
              <Text
                className={`text-sm ${isSelected ? 'font-medium text-primary-500' : 'text-primary-900'}`}
                numberOfLines={1}
                ellipsizeMode="middle"
              >
                {item.label}
              </Text>
            </VStack>
          </Box>
        </Pressable>
      ),
      [onSelect, onClose],
    );

    const emptyComponent =
      files === null ? (
        <VStack space="md" className="flex-1 items-center justify-center p-8">
          <Spinner size="small" className="text-background-400" />
          <Text className="text-sm text-typography-400">Reading the server&apos;s images…</Text>
        </VStack>
      ) : (
        <VStack space="md" className="flex-1 items-center justify-center p-8">
          <Icon as={failed ? WifiOff : ImageOff} className="h-8 w-8 text-typography-300" />
          <Text className="text-center text-sm text-typography-400">
            {failed
              ? 'Could not reach the server to read its images. Check that it is online, then refresh.'
              : 'No images in this server’s input folder yet. Anything you upload shows up here afterwards.'}
          </Text>
        </VStack>
      );

    return (
      <SearchableBottomSheet
        ref={ref}
        isVisible={isVisible}
        onClose={onClose}
        onSelect={onSelect}
        title="Server Images"
        options={options}
        value={value}
        searchPlaceholder="Search images..."
        showRefreshButton
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        renderItem={renderItem}
        emptyComponent={emptyComponent}
        numColumns={2}
      />
    );
  },
);
