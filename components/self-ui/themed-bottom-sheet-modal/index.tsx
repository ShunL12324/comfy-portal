import { Colors } from '@/constants/Colors';
import { useThemeStore } from '@/store/theme';
import {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetModalProps,
} from '@gorhom/bottom-sheet';
import React, { forwardRef, useCallback } from 'react';

// Define the component using forwardRef
export const ThemedBottomSheetModal = forwardRef<
  BottomSheetModal,
  BottomSheetModalProps
>((props, ref) => {
  const { theme } = useThemeStore(); // Get theme
  const isDarkMode = theme === 'dark';

  // Define theme-based colors (Subtly Darker Dark BG)
  const handleColor = isDarkMode
    ? Colors.dark.outline[500] // Keep handle visible
    : Colors.light.outline[500];
  const backgroundColor = isDarkMode
    ? Colors.dark.background[100] // Dark: Use background[100] (#202020)
    : Colors.light.background[50];

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

  return (
    <BottomSheetModal
      ref={ref} // Forward the ref
      handleIndicatorStyle={{ backgroundColor: handleColor }}
      backgroundStyle={{ backgroundColor: backgroundColor }}
      backdropComponent={renderBackdrop} // Add backdrop component
      {...props} // Pass down all other props
    />
  );
});

ThemedBottomSheetModal.displayName = 'ThemedBottomSheetModal'; 