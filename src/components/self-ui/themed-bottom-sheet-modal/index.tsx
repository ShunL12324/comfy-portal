import { useDerivedValue } from 'react-native-reanimated';
import { useSheetAppearance } from '@/components/ui/design-system/overlays';
import { useDesign } from '@/components/ui/design-system/primitives';
import { designTokens as t } from '@/constants/design-tokens';
import { View } from '@/components/ui/view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BottomSheetFooter,
  useBottomSheetInternal,
  BottomSheetFooterProps,
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetModalProps,
} from '@gorhom/bottom-sheet';
import { forwardRef, useCallback, useMemo, Children, type ReactNode, type PropsWithChildren } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import { ControlDensityProvider } from '@/components/ui/design-system/control-density';

// Define the component using forwardRef
export const ThemedBottomSheetModal = forwardRef<BottomSheetModal, BottomSheetModalProps>((props, ref) => {
  const appearance = useSheetAppearance();
  const { width } = useWindowDimensions();

  // Define the backdrop render function
  const renderBackdrop = useCallback(
    (backdropProps: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...backdropProps}
        appearsOnIndex={0} // Show backdrop when sheet is open (index 0)
        disappearsOnIndex={-1} // Hide backdrop when sheet is closed (index -1)
        // Don't dismiss keyboard when pressing backdrop - removed onPress handler
        // Default backdrop opacity is usually fine, but can be customized here
      />
    ),
    [],
  );

  const ipadStyle = useMemo(() => (width >= 768 ? { marginHorizontal: (width - 540) / 2 } : undefined), [width]);

  return (
    <ControlDensityProvider value="default">
      <BottomSheetModal
        ref={ref} // Forward the ref
        accessible={false}
        backdropComponent={renderBackdrop} // Add backdrop component
        {...props} // Pass down all other props
        backgroundStyle={StyleSheet.flatten([appearance.backgroundStyle, props.backgroundStyle])}
        handleStyle={StyleSheet.flatten([appearance.handleStyle, props.handleStyle])}
        handleIndicatorStyle={StyleSheet.flatten([appearance.handleIndicatorStyle, props.handleIndicatorStyle])}
        style={StyleSheet.flatten([ipadStyle, props.style])}
      />
    </ControlDensityProvider>
  );
});

ThemedBottomSheetModal.displayName = 'ThemedBottomSheetModal';

// Gorhom positions this surface above the keyboard; the scroll view reserves its measured height.
export function ThemedSheetFooter({
  children,
  belowActions,
  ...props
}: PropsWithChildren<BottomSheetFooterProps & { belowActions?: ReactNode }>) {
  const c = useDesign();
  const insets = useSafeAreaInsets();
  const { animatedPosition, animatedDetentsState } = useBottomSheetInternal();
  const { animatedFooterPosition } = props;
  const attachedFooterPosition = useDerivedValue(() => {
    const lowestOpenPosition = animatedDetentsState.get().detents?.[0];
    if (lowestOpenPosition === undefined) return animatedFooterPosition.get();
    // The stock footer cancels sheet translation to stick to the window edge.
    // Below the lowest open detent, undo that cancellation so entrance, drag
    // dismissal and exit carry the footer with the sheet as one rigid surface.
    return animatedFooterPosition.get() + Math.max(0, animatedPosition.get() - lowestOpenPosition);
  });
  return (
    <BottomSheetFooter {...props} animatedFooterPosition={attachedFooterPosition} bottomInset={insets.bottom}>
      <View
        testID="sheet-fixed-actions"
        style={{
          backgroundColor: c.overlay,
          paddingHorizontal: t.layout.inset,
          paddingVertical: t.layout.related,
          flexDirection: 'column',
          gap: t.layout.related,
        }}
      >
        <View style={{ flexDirection: 'row', gap: t.layout.related }}>
          {Children.map(children, (child) => child && <View style={{ flex: 1, minWidth: 0 }}>{child}</View>)}
        </View>
        {belowActions}
      </View>
    </BottomSheetFooter>
  );
}
