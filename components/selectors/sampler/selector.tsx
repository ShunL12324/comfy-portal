import React, { useCallback, useRef } from 'react';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { ChevronDown } from 'lucide-react-native';
import { Icon } from '@/components/ui/icon';
import { SearchableBottomSheet } from '../bottom-sheet';
import { SAMPLER_OPTIONS } from './constants';
import { Sampler } from './constants';
import { BottomSheetModal } from '@gorhom/bottom-sheet';

interface SamplerSelectorProps {
  value: Sampler;
  onChange: (value: Sampler) => void;
}

export function SamplerSelector({ value, onChange }: SamplerSelectorProps) {
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

  const selectedOption = SAMPLER_OPTIONS.find(
    (option) => option.value === value,
  );

  return (
    <>
      <Pressable
        className="flex-row items-center justify-between rounded-xl bg-background-50 px-4 py-3"
        onPress={handlePress}
      >
        <Text className="text-sm text-typography-900">
          {selectedOption?.label || value}
        </Text>
        <Icon as={ChevronDown} size="sm" className="text-primary-300" />
      </Pressable>

      <SearchableBottomSheet
        ref={bottomSheetRef}
        isVisible={isVisible}
        onClose={handleClose}
        onSelect={(newValue) => {
          onChange(newValue as Sampler);
          handleClose();
        }}
        title="Select Sampler"
        options={SAMPLER_OPTIONS}
        value={value}
        showSearch={false}
      />
    </>
  );
}
