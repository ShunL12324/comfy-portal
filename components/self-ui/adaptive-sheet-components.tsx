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
import {
  KeyboardAwareScrollView,
  KeyboardAwareScrollViewProps,
} from 'react-native-keyboard-controller';
import BottomSheetKeyboardAwareScrollView from './bottom-sheet-keyboard-aware-scroll-view';

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
    // ref type differs between BottomSheetTextInput and TextInput — cast required
    return <Component ref={ref as any} {...props} />;
  },
);
AdaptiveTextInput.displayName = 'AdaptiveTextInput';

export const AdaptiveScrollView = forwardRef<ScrollView, ScrollViewProps>(
  (props, ref) => {
    const isInSheet = useIsInBottomSheet();
    if (isInSheet) {
      // ref type differs between BottomSheetScrollView and ScrollView — cast required
      return <BottomSheetScrollView ref={ref as any} {...(props as any)} />;
    }
    return <ScrollView ref={ref} {...props} />;
  },
);
AdaptiveScrollView.displayName = 'AdaptiveScrollView';

/**
 * Keyboard-aware scroll view that works in both BottomSheet and plain contexts.
 * In BottomSheet: uses BottomSheetKeyboardAwareScrollView (gorhom-compatible wrapper)
 * Outside BottomSheet: uses plain KeyboardAwareScrollView
 */
export const AdaptiveKeyboardAwareScrollView = forwardRef<ScrollView, KeyboardAwareScrollViewProps>(
  (props, ref) => {
    const isInSheet = useIsInBottomSheet();
    if (isInSheet) {
      return <BottomSheetKeyboardAwareScrollView ref={ref as any} {...(props as any)} />;
    }
    return <KeyboardAwareScrollView ref={ref as any} {...props} />;
  },
);
AdaptiveKeyboardAwareScrollView.displayName = 'AdaptiveKeyboardAwareScrollView';

export function AdaptiveFlatList<T>(props: FlatListProps<T>) {
  const isInSheet = useIsInBottomSheet();
  if (isInSheet) {
    return <BottomSheetFlatList {...(props as any)} />;
  }
  return <FlatList {...props} />;
}
