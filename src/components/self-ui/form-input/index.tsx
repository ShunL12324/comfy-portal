import type { ComponentProps } from 'react';
import { BottomSheetProvider } from '@/context/bottom-sheet-context';
import { BottomSheetFormInput } from './bottom-sheet-form-input-shared';

// Keep the field skin identical while using the non-sheet native input outside a sheet.
export function FormInput(props: ComponentProps<typeof BottomSheetFormInput>) {
  return (
    <BottomSheetProvider isInSheet={false}>
      <BottomSheetFormInput {...props} />
    </BottomSheetProvider>
  );
}
