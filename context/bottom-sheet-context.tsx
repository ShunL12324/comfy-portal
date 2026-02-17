import React, { createContext, useContext } from 'react';

// Whether the subtree is rendered inside a @gorhom/bottom-sheet.
// Components that conditionally use BottomSheet-specific inputs
// (e.g. BottomSheetTextInput) check this to fall back to plain RN inputs.
const BottomSheetContext = createContext(true);

export const BottomSheetProvider = ({
  isInSheet,
  children,
}: {
  isInSheet: boolean;
  children: React.ReactNode;
}) => <BottomSheetContext.Provider value={isInSheet}>{children}</BottomSheetContext.Provider>;

export const useIsInBottomSheet = () => useContext(BottomSheetContext);
