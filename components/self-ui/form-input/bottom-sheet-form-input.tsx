import { Colors } from '@/constants/Colors';
import { useResolvedTheme } from '@/store/theme';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { Eye, EyeOff } from 'lucide-react-native';
import React, { useState } from 'react';
import { StyleSheet, Text, TextInputProps, TextStyle, TouchableOpacity, View, ViewStyle } from 'react-native';

interface BottomSheetFormInputProps extends TextInputProps {
  title?: string;
  error?: string;
  containerStyle?: ViewStyle;
  inputContainerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  titleStyle?: TextStyle;
  errorStyle?: TextStyle;
}

export const BottomSheetFormInput: React.FC<BottomSheetFormInputProps> = ({
  title,
  error,
  containerStyle,
  inputContainerStyle,
  inputStyle,
  titleStyle,
  errorStyle,
  placeholder,
  secureTextEntry,
  ...restProps
}) => {
  const theme = useResolvedTheme();
  const isDarkMode = theme === 'dark';
  const [showPassword, setShowPassword] = useState(false);

  const inputBackgroundColor = isDarkMode ? Colors.dark.background[50] : Colors.light.background[0];
  const inputTextColor = isDarkMode ? Colors.dark.typography[800] : Colors.light.typography[950];
  const placeholderTextColor = isDarkMode ? Colors.dark.typography[400] : Colors.light.typography[400];
  const titleTextColor = isDarkMode ? Colors.dark.typography[600] : Colors.light.typography[600];
  const errorTextColor = isDarkMode ? Colors.dark.error[500] : Colors.light.error[500];
  const iconColor = isDarkMode ? Colors.dark.typography[600] : Colors.light.typography[600];

  const isPasswordInput = secureTextEntry === true;

  return (
    <View style={[styles.container, containerStyle]}>
      {title && (
        <Text style={[
          styles.title,
          { color: titleTextColor },
          titleStyle
        ]}>
          {title}
        </Text>
      )}

      <View style={[
        styles.inputContainer,
        { backgroundColor: inputBackgroundColor },
        inputContainerStyle
      ]}>
        <BottomSheetTextInput
          style={[
            styles.input,
            { color: inputTextColor },
            isPasswordInput && { paddingRight: 40 },
            inputStyle
          ]}
          placeholder={placeholder}
          placeholderTextColor={placeholderTextColor}
          secureTextEntry={isPasswordInput && !showPassword}
          {...restProps}
        />

        {isPasswordInput && (
          <TouchableOpacity
            style={styles.eyeIcon}
            onPress={() => setShowPassword(!showPassword)}
            activeOpacity={0.7}
          >
            {showPassword ? (
              <EyeOff size={18} color={iconColor} />
            ) : (
              <Eye size={18} color={iconColor} />
            )}
          </TouchableOpacity>
        )}
      </View>

      {error && (
        <Text style={[
          styles.error,
          { color: errorTextColor },
          errorStyle
        ]}>
          {error}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 10,
  },
  title: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  inputContainer: {
    borderWidth: 0,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  input: {
    height: 36,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  error: {
    fontSize: 12,
    marginTop: 2,
  },
  eyeIcon: {
    position: 'absolute',
    right: 12,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  }
});
