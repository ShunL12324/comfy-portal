/**
 * Web shim for @gorhom/bottom-sheet
 * Re-exports everything from the original package, but replaces
 * BottomSheetTextInput with a standard TextInput (the original
 * crashes on web due to _scrollRef being null).
 */

// Import directly from the lib path to avoid Metro resolve loop
const bottomSheet = require('@gorhom/bottom-sheet/lib/commonjs/index.js');

// Re-export everything from the original
export default bottomSheet.default;
export const BottomSheetBackdrop = bottomSheet.BottomSheetBackdrop;
export const BottomSheetView = bottomSheet.BottomSheetView;
export const BottomSheetHandle = bottomSheet.BottomSheetHandle;
export const BottomSheetScrollView = bottomSheet.BottomSheetScrollView;
export const BottomSheetFlatList = bottomSheet.BottomSheetFlatList;
export const BottomSheetSectionList = bottomSheet.BottomSheetSectionList;
export const BottomSheetModal = bottomSheet.BottomSheetModal;
export const BottomSheetModalProvider = bottomSheet.BottomSheetModalProvider;
export const BottomSheetFooter = bottomSheet.BottomSheetFooter;
export const useBottomSheet = bottomSheet.useBottomSheet;
export const useBottomSheetModal = bottomSheet.useBottomSheetModal;
export const useBottomSheetDynamicSnapPoints = bottomSheet.useBottomSheetDynamicSnapPoints;
export const useBottomSheetTimingConfigs = bottomSheet.useBottomSheetTimingConfigs;
export const useBottomSheetSpringConfigs = bottomSheet.useBottomSheetSpringConfigs;
export const useBottomSheetInternal = bottomSheet.useBottomSheetInternal;

// Replace BottomSheetTextInput with standard TextInput on web
import { TextInput } from 'react-native';
export const BottomSheetTextInput = TextInput;
