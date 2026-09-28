import { useCompactControls } from '@/components/ui/design-system/control-density';
import { designTokens as t } from '@/constants/design-tokens';
import { View as Box } from '@/components/ui/view';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { Copy } from '@/components/ui/design-system/primitives';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { ChevronDown } from '@/constants/icons';
import React, { useCallback, useRef } from 'react';
import { SearchableBottomSheet } from '../bottom-sheet';
import { OptionSelectorProps } from './types';

export function OptionSelector<T extends string>({
  value,
  onChange,
  options,
  title = 'Select Option',
  showSearch = false,
  searchPlaceholder,
  onRefresh,
  isRefreshing = false,
}: OptionSelectorProps<T>) {
  const compact = useCompactControls();
  const [isVisible, setIsVisible] = React.useState(false);
  const bottomSheetRef = useRef<BottomSheetModal>(null);

  const handlePress = useCallback(() => {
    setIsVisible(true);
  }, []);

  const handleClose = useCallback(() => {
    setIsVisible(false);
  }, []);

  const selectedOption = options.find((option) => option.value === value);

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${title}: ${selectedOption?.label || value || 'Choose'}`}
        className={
          compact
            ? 'flex-row items-center justify-between'
            : 'rounded-lg bg-surface-raised px-3 py-3 flex-row items-center justify-between'
        }
        style={
          compact ? { minHeight: t.height.touch, paddingHorizontal: t.node.inset, gap: t.node.inlineGap } : undefined
        }
        onPress={handlePress}
      >
        {compact && (
          <Box
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: (t.height.touch - t.height.control) / 2,
              left: 0,
              right: 0,
              height: t.height.control,
              borderRadius: t.radius.control,
            }}
            className="bg-well"
          />
        )}
        <HStack space="sm" className="flex-1 items-center">
          {selectedOption?.icon}
          <Copy className="flex-1" numberOfLines={1}>
            {selectedOption?.label || value}
          </Copy>
        </HStack>
        <Icon as={ChevronDown} size="sm" className="text-content-primary" />
      </Pressable>

      <SearchableBottomSheet
        ref={bottomSheetRef}
        isVisible={isVisible}
        onClose={handleClose}
        onSelect={(newValue) => {
          onChange(newValue as T);
          handleClose();
        }}
        title={title}
        options={options}
        value={value}
        showSearch={showSearch}
        searchPlaceholder={searchPlaceholder}
        showRefreshButton={!!onRefresh}
        onRefresh={onRefresh}
        isRefreshing={isRefreshing}
      />
    </>
  );
}
