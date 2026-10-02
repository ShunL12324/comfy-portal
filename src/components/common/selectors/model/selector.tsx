import { useCompactControls } from '@/components/ui/design-system/control-density';
import { Action, Copy, Row, StateIcon, useDesign } from '@/components/ui/design-system/primitives';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { View as Box } from '@/components/ui/view';
import { VStack } from '@/components/ui/vstack';
import { useServersStore } from '@/features/server/stores/server-store';
import { clearNodeSchemaCache } from '@/services/node-schema';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { Image } from 'expo-image';
import { Check, ChevronDown, ImageIcon } from '@/constants/icons';
import React, { useCallback, useRef } from 'react';
import { SearchableBottomSheet } from '../bottom-sheet';
import { getOptionSurfaceStyle } from '../bottom-sheet/item';
import { SelectorOption } from '../types';
import { useModelOptions } from './use-model-options';
import { designTokens as t } from '@/constants/design-tokens';

interface ModelSelectorProps {
  value: string;
  onChange: (value: string) => void;
  onRefresh?: () => Promise<void>;
  isRefreshing?: boolean;
  /**
   * Model folders behind this input. Drives preview images and the refresh
   * button; the option list itself comes from the server whenever it can.
   */
  type?: string | string[];
  /** Node class this picker belongs to, e.g. `CheckpointLoaderSimple`. */
  classType?: string;
  /** Input this picker edits, e.g. `ckpt_name`. */
  inputName?: string;
  serverId: string;
}

function ModelPreview({ image, label }: { image?: string; label: string }) {
  const c = useDesign();
  const [failedImage, setFailedImage] = React.useState<string>();
  if (!image || failedImage === image) {
    return (
      <Box className="h-full w-full items-center justify-center" style={{ backgroundColor: c.well }}>
        <StateIcon icon={ImageIcon} size={t.icon.control} />
      </Box>
    );
  }

  return (
    <Image
      source={{ uri: image }}
      alt={label}
      style={{ height: '100%', width: '100%' }}
      contentFit="cover"
      onError={() => setFailedImage(image)}
    />
  );
}

export function ModelSelector({
  value,
  onChange,
  onRefresh: customOnRefresh,
  isRefreshing: customIsRefreshing,
  type = 'checkpoints',
  classType,
  inputName,
  serverId,
}: ModelSelectorProps) {
  const [isVisible, setIsVisible] = React.useState(false);
  const [preview, setPreview] = React.useState<SelectorOption | null>(null);
  const c = useDesign();
  const compact = useCompactControls();
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const server = useServersStore((state) => state.servers.find((s) => s.id === serverId));
  const syncModels = useServersStore((state) => state.syncModels);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const folders = Array.isArray(type) ? type : [type];

  // Rescan just this picker's folders. The merge (and the "don't clobber a good
  // catalogue on failure" rule) lives in the store, so this only has to say
  // which folders it cares about.
  //
  // Also drop this node's cached definition, since the reason to press refresh
  // is usually that a model was just downloaded and the option list is what's
  // stale — the previews are the secondary concern.
  const defaultOnRefresh = async () => {
    if (!server) return;
    setIsRefreshing(true);
    try {
      clearNodeSchemaCache(serverId);
      await syncModels(serverId, { folders, refreshPreviews: true });
    } finally {
      setIsRefreshing(false);
    }
  };

  const onRefresh = customOnRefresh || defaultOnRefresh;
  const finalIsRefreshing = customIsRefreshing ?? isRefreshing;

  const handlePress = useCallback(() => {
    setIsVisible(true);
  }, []);

  const handleClose = useCallback(() => {
    setIsVisible(false);
    setPreview(null);
  }, []);

  const { options, fromServer } = useModelOptions({ serverId, classType, inputName, folders });

  // The server's node definition is exhaustive, so a value missing from it
  // genuinely isn't installed — flagged on the trigger rather than cleared,
  // since silently dropping it would erase what the workflow actually asked
  // for, and generate rejecting it is the honest outcome for a model that was
  // never there. From the local folder-cache fallback (fromServer: false)
  // absence only means we haven't rescanned since it appeared, so it isn't
  // flagged. 'None' is excluded: ComfyUI uses it as the literal enum for an
  // unset optional model, not a missing one.
  //
  // The picker itself only ever shows real, installed models — a value that
  // isn't there isn't something to pick, so it's never added as a tile.
  const isMissing = fromServer && !!value && value !== 'None' && !options.some((option) => option.value === value);
  const currentOption = options.find((option) => option.value === value);
  const missingLabel = isMissing ? value.replace(/\.[^/.]+$/, '') : undefined;

  const renderTrigger = useCallback(
    () => (
      <Box
        className={
          compact
            ? 'overflow-hidden'
            : `rounded-lg overflow-hidden ${isMissing ? 'border-stroke bg-surface-sunken border-[0.5px]' : 'bg-surface-raised'}`
        }
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Select model: ${value || 'Choose'}`}
          onPress={handlePress}
        >
          {compact && (
            <Box
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: 4,
                left: 0,
                right: 0,
                bottom: 4,
                borderRadius: t.radius.control,
                backgroundColor: c.well,
              }}
            />
          )}
          <HStack
            space="sm"
            className={compact ? 'items-center justify-between' : 'p-3 items-center justify-between'}
            style={
              compact
                ? {
                    paddingHorizontal: t.node.inset,
                    minHeight: t.height.touch,
                    paddingVertical: isMissing ? t.node.inlineGap : 0,
                  }
                : undefined
            }
          >
            <HStack space="sm" className="flex-1 items-center">
              {!!currentOption?.image && (
                <Box className="h-8 w-8 rounded-md overflow-hidden">
                  <ModelPreview image={currentOption.image} label={currentOption.label} />
                </Box>
              )}
              <VStack space="xs" className="flex-1">
                <Copy
                  style={{ fontWeight: compact ? '400' : '500', color: isMissing ? c.danger : c.ink }}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {missingLabel || currentOption?.label || value || 'Select model'}
                </Copy>
                {(!compact || isMissing) && (
                  <Copy
                    size={compact ? 'metadata' : 'label'}
                    muted={!isMissing}
                    style={isMissing ? { color: c.danger } : undefined}
                  >
                    {isMissing
                      ? 'Not installed on server'
                      : currentOption?.description || currentOption?.serverName || 'Choose a model'}
                  </Copy>
                )}
              </VStack>
            </HStack>
            <Icon as={ChevronDown} size="sm" className="text-content-tertiary" />
          </HStack>
        </Pressable>
      </Box>
    ),
    [handlePress, value, isMissing, currentOption, missingLabel, c, compact],
  );

  const renderItem = useCallback(
    (item: SelectorOption, isSelected: boolean) => (
      <Box
        testID={`selector-option-${item.value}`}
        style={[getOptionSurfaceStyle(c, isSelected), { padding: t.layout.related }]}
      >
        <Row style={{ gap: t.layout.related }}>
          {item.image ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Preview ${item.label}`}
              onPress={() => setPreview(item)}
              style={{
                width: t.height.touch,
                height: t.height.touch,
                borderRadius: t.radius.small,
                overflow: 'hidden',
              }}
            >
              <ModelPreview image={item.image} label={item.label} />
            </Pressable>
          ) : (
            <Box
              style={{
                width: t.height.touch,
                height: t.height.touch,
                borderRadius: t.radius.small,
                overflow: 'hidden',
              }}
            >
              <ModelPreview label={item.label} />
            </Box>
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={item.label}
            accessibilityState={{ selected: isSelected }}
            aria-pressed={isSelected}
            onPress={() => {
              onChange(item.value);
              handleClose();
            }}
            style={{ flex: 1, minHeight: t.height.touch, justifyContent: 'center' }}
          >
            <Row style={{ gap: t.layout.related }}>
              <Box style={{ flex: 1, gap: t.layout.label }}>
                <Copy size="body" numberOfLines={2} style={{ fontWeight: '500' }}>
                  {item.label}
                </Copy>
                <Copy muted size="metadata" numberOfLines={1}>
                  {item.description || item.serverName || item.value}
                </Copy>
              </Box>
              {isSelected && <Icon as={Check} size="sm" className="text-tint" />}
            </Row>
          </Pressable>
        </Row>
      </Box>
    ),
    [onChange, handleClose, c],
  );

  return (
    <SearchableBottomSheet
      ref={bottomSheetRef}
      isVisible={isVisible}
      onClose={handleClose}
      onSelect={onChange}
      title={preview ? 'Model preview' : `Select ${type}`}
      options={preview ? [] : options}
      showSearch={!preview}
      value={value}
      searchPlaceholder={`Search ${type}...`}
      showRefreshButton={!!onRefresh}
      onRefresh={onRefresh}
      isRefreshing={finalIsRefreshing}
      renderTrigger={renderTrigger}
      renderItem={renderItem}
      numColumns={1}
      emptyComponent={
        preview ? (
          <Box style={{ gap: t.layout.field }}>
            <Row>
              <Action kind="text" onPress={() => setPreview(null)}>
                Back to models
              </Action>
            </Row>
            <Box style={{ height: 280, borderRadius: t.radius.control, overflow: 'hidden' }}>
              <Image source={{ uri: preview.image }} style={{ width: '100%', height: '100%' }} contentFit="contain" />
            </Box>
            <Copy>{preview.label}</Copy>
            <Copy mono muted size="metadata">
              {preview.value}
            </Copy>
            <Action
              onPress={() => {
                onChange(preview.value);
                handleClose();
              }}
            >
              Use model
            </Action>
          </Box>
        ) : (
          <Box>
            <Copy muted>No models installed for this input. Refresh after installing on your server.</Copy>
          </Box>
        )
      }
    />
  );
}
