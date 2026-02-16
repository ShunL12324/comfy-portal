import { useThemeColor } from '@/hooks/useThemeColor';
import { useResolvedTheme } from '@/store/theme';
import {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetModalProps,
} from '@gorhom/bottom-sheet';
import React, { forwardRef, useCallback, useMemo } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';

// Define the component using forwardRef
export const ThemedBottomSheetModal = forwardRef<
  BottomSheetModal,
  BottomSheetModalProps
>((props, ref) => {
  const theme = useResolvedTheme();
  const colors = useThemeColor();
  const { width } = useWindowDimensions();

  // Define theme-based colors (Subtly Darker Dark BG)
  const handleColor = colors.outline[500];
  const backgroundColor = theme === 'dark'
    ? colors.background[100] // Dark: Use background[100] (#202020)
    : colors.background[50];

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

  const ipadStyle = useMemo(
    () =>
      width >= 768
        ? { maxWidth: 540, alignSelf: 'center' as const, width: '100%' as const }
        : undefined,
    [width],
  );

  return (
    <BottomSheetModal
      ref={ref} // Forward the ref
      handleIndicatorStyle={{ backgroundColor: handleColor }}
      backgroundStyle={{ backgroundColor: backgroundColor }}
      backdropComponent={renderBackdrop} // Add backdrop component
      {...props} // Pass down all other props
      style={StyleSheet.flatten([ipadStyle, props.style])}
    />
  );
});

ThemedBottomSheetModal.displayName = 'ThemedBottomSheetModal'; 