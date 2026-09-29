import { useCompactControls } from '@/components/ui/design-system/control-density';
import { designTokens as t } from '@/constants/design-tokens';
import { View as Box } from '@/components/ui/view';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { Copy, StateIcon, useDesign } from '@/components/ui/design-system/primitives';
import { VStack } from '@/components/ui/vstack';
import { SearchableBottomSheet } from '@/components/common/selectors/bottom-sheet';
import { getOptionSurfaceStyle } from '@/components/common/selectors/bottom-sheet/item';
import { SelectorOption } from '@/components/common/selectors/types';
import { useModelOptions } from '@/components/common/selectors/model/use-model-options';
import { useServersStore } from '@/features/server/stores/server-store';
import { clearNodeSchemaCache } from '@/services/node-schema';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { Check, ChevronDown, ImageIcon } from '@/constants/icons';
import { Image } from 'expo-image';
import React, { useCallback, useRef, useState } from 'react';

interface OptionalModelSelectorProps {
  value: string;
  onChange: (value: string) => void;
  type: string | string[];
  classType?: string;
  inputName?: string;
  serverId: string;
}

/**
 * FL2VA/Ref2VA transformer pickers for MiniMaxH3EasyLoader.
 *
 * Both inputs are optional, and the node declares "none"/"None"/"无" as
 * interchangeable valid values for "unset" — a workaround for how ComfyUI's
 * own web frontend localizes that sentinel and submits the localized string
 * back for validation (see ComfyUI-MiniMaxH3-Easy/nodes.py, NONE_MODEL_*).
 * None of those three are a model to browse, so unlike the generic
 * ModelSelector this picker never shows them as choices — only real,
 * installed files, or nothing at all when none are installed.
 */
const NONE_SENTINELS = new Set(['none', 'None', '无']);

function ModelPreview({ image, label }: { image?: string; label: string }) {
  const c = useDesign();
  const [failedImage, setFailedImage] = useState<string>();
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

export function OptionalModelSelector({
  value,
  onChange,
  type,
  classType,
  inputName,
  serverId,
}: OptionalModelSelectorProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const c = useDesign();
  const compact = useCompactControls();
  const server = useServersStore((state) => state.servers.find((s) => s.id === serverId));
  const syncModels = useServersStore((state) => state.syncModels);
  const folders = Array.isArray(type) ? type : [type];

  // The node-schema cache never expires on its own — this is what a model
  // that was just downloaded (or, here, symlinked into place server-side)
  // needs pressed before it shows up.
  const onRefresh = async () => {
    if (!server) return;
    setIsRefreshing(true);
    try {
      clearNodeSchemaCache(serverId);
      await syncModels(serverId, { folders, refreshPreviews: true });
    } finally {
      setIsRefreshing(false);
    }
  };

  const { options: allOptions, fromServer } = useModelOptions({ serverId, classType, inputName, folders });
  const options = allOptions.filter((option) => !NONE_SENTINELS.has(option.value));

  // The server's node definition is exhaustive, so a value that's neither a
  // real option nor a none-sentinel genuinely isn't installed — flagged
  // rather than cleared, since silently dropping it would erase what the
  // workflow actually asked for.
  const isMissing = fromServer && !!value && !NONE_SENTINELS.has(value) && !options.some((o) => o.value === value);
  const currentOption = options.find((o) => o.value === value);
  const missingLabel = isMissing ? value.replace(/\.[^/.]+$/, '') : undefined;

  const handlePress = useCallback(() => {
    setIsVisible(true);
  }, []);
  const handleClose = useCallback(() => setIsVisible(false), []);

  const renderTrigger = useCallback(
    () => (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Select optional model ${inputName || type}: ${value || 'Choose'}`}
        onPress={handlePress}
      >
        <Box
          className={
            compact
              ? 'overflow-hidden'
              : `rounded-xl overflow-hidden ${isMissing ? 'border-status-danger/50 bg-well border-[0.5px]' : 'bg-surface-raised'}`
          }
        >
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
            <HStack space="sm" className="flex-1 items-center">
              {(!compact || currentOption?.image) && (
                <Box className="h-8 w-8 rounded-md overflow-hidden">
                  <ModelPreview image={currentOption?.image} label={currentOption?.label || ''} />
                </Box>
              )}
              <VStack space="xs" className="flex-1">
                <Copy
                  style={{ fontWeight: compact ? '400' : '500', ...(isMissing ? { color: c.danger } : null) }}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {missingLabel || currentOption?.label || 'None'}
                </Copy>
                {(!compact || isMissing) && (
                  <Copy size="metadata" muted style={isMissing ? { color: c.danger } : undefined}>
                    {isMissing ? 'Not installed on server' : currentOption?.description || 'Choose a model'}
                  </Copy>
                )}
              </VStack>
            </HStack>
            <Icon as={ChevronDown} size="sm" className="text-content-tertiary" />
          </HStack>
        </Box>
      </Pressable>
    ),
    [handlePress, isMissing, currentOption, missingLabel, c, compact, inputName, type, value],
  );

  const renderItem = useCallback(
    (item: SelectorOption, isSelected: boolean) => (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={item.label}
        accessibilityState={{ selected: isSelected }}
        aria-pressed={isSelected}
        onPress={() => {
          onChange(item.value);
          handleClose();
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
            <ModelPreview image={item.image} label={item.label} />
          </Box>
          <VStack space="xs" className="p-3">
            <Copy size="body" style={{ fontWeight: '500' }} numberOfLines={2} ellipsizeMode="tail">
              {item.label}
            </Copy>
            {item.description ? (
              <Copy size="label" muted numberOfLines={2}>
                {item.description}
              </Copy>
            ) : null}
          </VStack>
        </Box>
      </Pressable>
    ),
    [onChange, handleClose, c],
  );

  return (
    <SearchableBottomSheet
      ref={bottomSheetRef}
      isVisible={isVisible}
      onClose={handleClose}
      onSelect={onChange}
      title={`Select ${type}`}
      options={options}
      value={value}
      searchPlaceholder={`Search ${type}...`}
      showRefreshButton
      onRefresh={onRefresh}
      isRefreshing={isRefreshing}
      renderTrigger={renderTrigger}
      renderItem={renderItem}
      numColumns={2}
      emptyComponent={
        <VStack className="py-8 items-center">
          <Copy muted>No models installed for this input</Copy>
        </VStack>
      }
    />
  );
}
