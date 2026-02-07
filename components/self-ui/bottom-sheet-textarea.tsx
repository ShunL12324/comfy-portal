import { Colors } from '@/constants/Colors';
import { useResolvedTheme } from '@/store/theme';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import React from 'react';
import { StyleSheet, TextInputProps, TextStyle, ViewStyle } from 'react-native';

interface BottomSheetTextareaProps extends Omit<TextInputProps, 'multiline'> {
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  minHeight?: number;
}

export const BottomSheetTextarea: React.FC<BottomSheetTextareaProps> = ({
  containerStyle,
  inputStyle,
  placeholder,
  minHeight = 80,
  ...restProps
}) => {
  const theme = useResolvedTheme();
  const isDarkMode = theme === 'dark';

  const inputBackgroundColor = isDarkMode ? Colors.dark.background[50] : Colors.light.background[50];
  const inputTextColor = isDarkMode ? Colors.dark.typography[800] : Colors.light.typography[950];
  const placeholderTextColor = isDarkMode ? Colors.dark.typography[400] : Colors.light.typography[400];

  return (
    <BottomSheetTextInput
      style={[
        styles.input,
        {
          backgroundColor: inputBackgroundColor,
          color: inputTextColor,
          // Keep a stable textarea height to avoid layout jitter while typing in bottom sheets.
          height: minHeight,
        },
        inputStyle,
      ]}
      placeholder={placeholder}
      placeholderTextColor={placeholderTextColor}
      multiline
      scrollEnabled
      textAlignVertical="top"
      {...restProps}
    />
  );
};

const styles = StyleSheet.create({
  input: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
});
