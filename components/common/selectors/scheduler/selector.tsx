import { Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { ChevronDown } from 'lucide-react-native';
import React, { useCallback, useRef } from 'react';
import { SearchableBottomSheet } from '../bottom-sheet';
import { Scheduler, SCHEDULER_OPTIONS } from './constants';

interface SchedulerSelectorProps {
  value: Scheduler;
  onChange: (value: Scheduler) => void;
}

export function SchedulerSelector({ value, onChange }: SchedulerSelectorProps) {
  const [isVisible, setIsVisible] = React.useState(false);
  const bottomSheetRef = useRef<BottomSheetModal>(null);

  const handlePress = useCallback(() => {
    setIsVisible(true);
    bottomSheetRef.current?.present();
  }, []);

  const handleClose = useCallback(() => {
    setIsVisible(false);
    bottomSheetRef.current?.dismiss();
  }, []);

  const selectedOption = SCHEDULER_OPTIONS.find((option) => option.value === value);

  return (
    <>
      <Pressable
        className="flex-row items-center justify-between rounded-xl bg-background-50 px-4 py-3"
        onPress={handlePress}
      >
        <Text className="text-sm text-typography-900">{selectedOption?.label || value}</Text>
        <Icon as={ChevronDown} size="sm" className="text-typography-500" />
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
