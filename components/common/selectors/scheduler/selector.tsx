import { useCompactControls } from '@/components/ui/design-system/control-density';
import { designTokens as t } from '@/constants/design-tokens';
import { View as Box } from '@/components/ui/view';
import { Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { Copy } from '@/components/ui/design-system/primitives';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { ChevronDown } from '@/constants/icons';
import React, { useCallback, useRef } from 'react';
import { SearchableBottomSheet } from '../bottom-sheet';
import { Scheduler, SCHEDULER_OPTIONS } from './constants';

interface SchedulerSelectorProps {
  value: Scheduler;
  onChange: (value: Scheduler) => void;
}

export function SchedulerSelector({ value, onChange }: SchedulerSelectorProps) {
  const compact = useCompactControls();
  const [isVisible, setIsVisible] = React.useState(false);
  const bottomSheetRef = useRef<BottomSheetModal>(null);

  const handlePress = useCallback(() => {
    setIsVisible(true);
  }, []);

  const handleClose = useCallback(() => {
    setIsVisible(false);
  }, []);

  const selectedOption = SCHEDULER_OPTIONS.find((option) => option.value === value);

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Select Scheduler: ${selectedOption?.label || value}`}
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
        <Copy className="flex-1" numberOfLines={1}>
          {selectedOption?.label || value}
        </Copy>
        <Icon as={ChevronDown} size="sm" className="text-content-secondary" />
      </Pressable>

      <SearchableBottomSheet
        ref={bottomSheetRef}
        isVisible={isVisible}
        onClose={handleClose}
        onSelect={(newValue) => {
          onChange(newValue as Scheduler);
          handleClose();
        }}
        title="Select Scheduler"
        options={SCHEDULER_OPTIONS}
        value={value}
        showSearch={false}
      />
    </>
  );
}
