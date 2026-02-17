import { useIsInBottomSheet } from '@/context/bottom-sheet-context';
import {
  BottomSheetScrollView,
  BottomSheetTextInput,
  BottomSheetFlatList,
} from '@gorhom/bottom-sheet';
import React, { forwardRef } from 'react';
import {
  FlatList,
  FlatListProps,
  ScrollView,
  ScrollViewProps,
  TextInput,
  TextInputProps,
} from 'react-native';

/**
 * Adaptive components that automatically switch between @gorhom/bottom-sheet
 * variants and plain React Native equivalents based on BottomSheetContext.
 *
 * ALWAYS use these instead of importing from @gorhom/bottom-sheet directly
 * in feature / page code. This ensures iPad split-layout (no BottomSheet)
 * and phone BottomSheet layout both work without per-call-site branching.
 */

export const AdaptiveTextInput = forwardRef<TextInput, TextInputProps>(
  (props, ref) => {
    const isInSheet = useIsInBottomSheet();
    const Component = isInSheet ? BottomSheetTextInput : TextInput;
    return <Component ref={ref as any} {...props} />;
  },
);
AdaptiveTextInput.displayName = 'AdaptiveTextInput';

export const AdaptiveScrollView = forwardRef<ScrollView, ScrollViewProps>(
  (props, ref) => {
    const isInSheet = useIsInBottomSheet();
    if (isInSheet) {
      return <BottomSheetScrollView ref={ref as any} {...(props as any)} />;
    }
    return <ScrollView ref={ref} {...props} />;
  },
);
AdaptiveScrollView.displayName = 'AdaptiveScrollView';

export function AdaptiveFlatList<T>(props: FlatListProps<T>) {
  const isInSheet = useIsInBottomSheet();
  if (isInSheet) {
    return <BottomSheetFlatList {...(props as any)} />;
  }
  return <FlatList {...props} />;
}
