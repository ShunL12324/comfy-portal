import { useIsInBottomSheet } from '@/context/bottom-sheet-context';
import {
  BottomSheetScrollView,
  BottomSheetTextInput,
  BottomSheetFlatList,
  useBottomSheetInternal,
  type BottomSheetScrollableProps,
} from '@gorhom/bottom-sheet';
import React, { forwardRef } from 'react';
import {
  Platform,
  FlatList,
  FlatListProps,
  ScrollView,
  ScrollViewProps,
  TextInput,
  TextInputProps,
} from 'react-native';
import { KeyboardAwareScrollView, KeyboardAwareScrollViewProps } from 'react-native-keyboard-controller';
import BottomSheetKeyboardAwareScrollView from '../bottom-sheet-keyboard-aware-scroll-view';
import { cssInterop } from 'nativewind';
import { inputTypography } from '@/components/ui/design-system/typography';
import { designColors } from '@/constants/design-tokens';
import { useResolvedTheme } from '@/store/theme';

/**
 * Adaptive components that automatically switch between @gorhom/bottom-sheet
 * variants and plain React Native equivalents based on BottomSheetContext.
 *
 * ALWAYS use these instead of importing from @gorhom/bottom-sheet directly
 * in feature / page code. This ensures iPad split-layout (no BottomSheet)
 * and phone BottomSheet layout both work without per-call-site branching.
 */

export const AdaptiveTextInput = forwardRef<TextInput, TextInputProps>((props, ref) => {
  const colors = designColors[useResolvedTheme()];
  const isInSheet = useIsInBottomSheet();
  // RN Web has no TextInput.State.currentlyFocusedInput used by Gorhom.
  const Component = isInSheet && Platform.OS !== 'web' ? BottomSheetTextInput : TextInput;
  // ref type differs between BottomSheetTextInput and TextInput — cast required
  return (
    <Component
      ref={ref as any}
      selectionColor={Platform.OS === 'web' ? colors.tintSurface : colors.tint}
      cursorColor={colors.tint}
      {...props}
      style={inputTypography(props.style, props.multiline)}
    />
  );
});
AdaptiveTextInput.displayName = 'AdaptiveTextInput';
cssInterop(AdaptiveTextInput, { className: 'style' });

/** Gluestack inputs can render on a page or in any Gorhom sheet without caller flags. */
export const SheetAwareTextInput = forwardRef<TextInput, TextInputProps>((props, ref) => {
  const colors = designColors[useResolvedTheme()];
  const sheet = useBottomSheetInternal(true);
  const Component = sheet && Platform.OS !== 'web' ? BottomSheetTextInput : TextInput;
  return (
    <Component
      ref={ref as any}
      selectionColor={Platform.OS === 'web' ? colors.tintSurface : colors.tint}
      cursorColor={colors.tint}
      {...props}
      style={inputTypography(props.style, props.multiline)}
    />
  );
});
SheetAwareTextInput.displayName = 'SheetAwareTextInput';
cssInterop(SheetAwareTextInput, { className: 'style' });

type AdaptiveScrollViewProps = ScrollViewProps & Pick<BottomSheetScrollableProps, 'enableFooterMarginAdjustment'>;
export const AdaptiveScrollView = forwardRef<ScrollView, AdaptiveScrollViewProps>((props, ref) => {
  const isInSheet = useIsInBottomSheet();
  const { enableFooterMarginAdjustment, ...scrollProps } = props;
  if (isInSheet) {
    // ref type differs between BottomSheetScrollView and ScrollView — cast required
    return (
      <BottomSheetScrollView
        ref={ref as any}
        {...(scrollProps as any)}
        enableFooterMarginAdjustment={enableFooterMarginAdjustment}
      />
    );
  }
  return <ScrollView ref={ref} {...scrollProps} />;
});
AdaptiveScrollView.displayName = 'AdaptiveScrollView';

/**
 * Keyboard-aware scroll view that works in both BottomSheet and plain contexts.
 * In BottomSheet: uses BottomSheetKeyboardAwareScrollView (gorhom-compatible wrapper)
 * Outside BottomSheet: uses plain KeyboardAwareScrollView
 */
export const AdaptiveKeyboardAwareScrollView = forwardRef<ScrollView, KeyboardAwareScrollViewProps>((props, ref) => {
  const isInSheet = useIsInBottomSheet();
  if (isInSheet) {
    return <BottomSheetKeyboardAwareScrollView ref={ref as any} {...(props as any)} />;
  }
  return <KeyboardAwareScrollView ref={ref as any} {...props} />;
});
AdaptiveKeyboardAwareScrollView.displayName = 'AdaptiveKeyboardAwareScrollView';

export const AdaptiveFlatList = forwardRef<FlatList, FlatListProps<any>>((props, ref) => {
  const isInSheet = useIsInBottomSheet();
  if (isInSheet) {
    return <BottomSheetFlatList ref={ref as any} {...(props as any)} />;
  }
  return <FlatList ref={ref as any} {...props} />;
});
AdaptiveFlatList.displayName = 'AdaptiveFlatList';
