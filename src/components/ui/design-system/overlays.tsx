import { useResolvedTheme } from '@/store/theme';
import { StyleSheet, useWindowDimensions } from 'react-native';
import { designTokens as t } from '@/constants/design-tokens';
import React, { forwardRef, useCallback, useEffect, useRef } from 'react';
import GorhomBottomSheet, {
  type BottomSheetProps,
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetScrollView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { View as Box } from '@/components/ui/view';

import { Action, Title, useDesign } from './primitives';
import { ChevronLeft } from '@/constants/icons';
import { ControlDensityProvider } from './control-density';
/** One appearance contract for modal overlays and persistent workspace sheets. */
export function useSheetAppearance(outlined = false, layer: 'overlay' | 'workspace' = 'overlay') {
  const c = useDesign();
  const surface = layer === 'workspace' ? c.workspace : c.overlay;
  return {
    backgroundStyle: {
      backgroundColor: surface,
      borderTopLeftRadius: t.radius.sheet,
      borderTopRightRadius: t.radius.sheet,
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
      ...(outlined ? { borderWidth: 1, borderColor: c.line } : {}),
    },
    handleStyle: {
      height: t.sheet.handleHeight,
      backgroundColor: surface,
      borderTopLeftRadius: t.radius.sheet,
      borderTopRightRadius: t.radius.sheet,
      ...(outlined ? { borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, borderColor: c.line } : {}),
    },
    handleIndicatorStyle: {
      backgroundColor: c.muted,
      width: t.sheet.indicatorWidth,
      height: t.sheet.indicatorHeight,
    },
  };
}

/** A persistent Gorhom panel, with the same theme as our modal Sheet. */
export const PersistentSheet = forwardRef<GorhomBottomSheet, BottomSheetProps>(function PersistentSheet(
  { backgroundStyle, handleStyle, handleIndicatorStyle, style, ...props },
  ref,
) {
  const appearance = useSheetAppearance(false, 'workspace');
  const mode = useResolvedTheme();
  const c = useDesign();
  return (
    <ControlDensityProvider value="default">
      <GorhomBottomSheet
        ref={ref}
        accessible={false}
        {...props}
        style={StyleSheet.flatten([{ ...t.elevation.workspace[mode], shadowColor: c.media }, style])}
        backgroundStyle={StyleSheet.flatten([appearance.backgroundStyle, backgroundStyle])}
        handleStyle={StyleSheet.flatten([appearance.handleStyle, handleStyle])}
        handleIndicatorStyle={StyleSheet.flatten([appearance.handleIndicatorStyle, handleIndicatorStyle])}
      />
    </ControlDensityProvider>
  );
});

export function Sheet({
  open,
  onClose,
  title,
  children,
  centerTitle = false,
  compactTitle = false,
  stackBehavior = 'switch',
  snapPoints,
  dismissible = true,
  onDismiss,
  onBack,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  centerTitle?: boolean;
  compactTitle?: boolean;
  stackBehavior?: 'push' | 'switch' | 'replace';
  snapPoints?: (string | number)[];
  dismissible?: boolean;
  onDismiss?: () => void;
  /** A step inside the sheet: a back chevron before the title returns to the previous step. */
  onBack?: () => void;
}) {
  const ref = useRef<BottomSheetModal>(null);
  const presented = useRef(false);
  const appearance = useSheetAppearance();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  useEffect(() => {
    if (open) {
      presented.current = true;
      ref.current?.present();
    } else if (presented.current) {
      // Gorhom 5.2.14 cannot dismiss before the first presentation (#2669).
      presented.current = false;
      ref.current?.dismiss();
    }
  }, [open]);
  const handleDismiss = useCallback(() => {
    // Native gestures/backdrop already dismissed the modal. Never dismiss it again.
    presented.current = false;
    onClose();
    onDismiss?.();
  }, [onClose, onDismiss]);
  const backdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior={dismissible ? 'close' : 'none'}
      />
    ),
    [dismissible],
  );
  return (
    <ControlDensityProvider value="default">
      <BottomSheetModal
        ref={ref}
        accessible={false}
        onDismiss={handleDismiss}
        stackBehavior={stackBehavior}
        snapPoints={snapPoints}
        enableDynamicSizing={!snapPoints}
        maxDynamicContentSize={height - insets.top - 16}
        enablePanDownToClose={dismissible}
        backdropComponent={backdrop}
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        enableBlurKeyboardOnGesture
        topInset={insets.top}
        {...appearance}
      >
        <BottomSheetScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            padding: t.layout.inset,
            paddingBottom: insets.bottom + t.layout.inset,
            gap: t.layout.field,
          }}
        >
          <Box
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: centerTitle ? 'center' : 'space-between',
            }}
          >
            {onBack && (
              // The glyph, not its 44-point target, sits on the sheet's inset.
              <Box style={{ marginLeft: -(t.height.touch - t.icon.small) / 2 }}>
                <Action kind="text" icon={ChevronLeft} label="Back" onPress={onBack} />
              </Box>
            )}
            <Box style={{ flex: 1, minWidth: 0, alignItems: centerTitle ? 'center' : 'flex-start' }}>
              <Title compact={compactTitle}>{title}</Title>
            </Box>
          </Box>
          {children}
        </BottomSheetScrollView>
      </BottomSheetModal>
    </ControlDensityProvider>
  );
}
