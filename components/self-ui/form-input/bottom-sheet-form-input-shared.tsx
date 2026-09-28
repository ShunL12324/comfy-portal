import { designTokens as t, iconStroke } from '@/constants/design-tokens';
import { Copy, FieldLabel, useDesign } from '@/components/ui/design-system/primitives';
import { Colors } from '@/constants/Colors';
import { useResolvedTheme } from '@/store/theme';
import { Eye, EyeOff } from '@/constants/icons';
import React, { useState } from 'react';
import { StyleSheet, TextInputProps, TextStyle, View, ViewStyle } from 'react-native';
import { AdaptiveTextInput } from '../adaptive-sheet-components';
import { Pressable } from '@/components/ui/pressable';

interface BottomSheetFormInputProps extends TextInputProps {
  title?: string;
  error?: string;
  containerStyle?: ViewStyle;
  inputContainerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  errorStyle?: TextStyle;
}

export const BottomSheetFormInput: React.FC<BottomSheetFormInputProps> = ({
  title,
  error,
  containerStyle,
  inputContainerStyle,
  inputStyle,
  errorStyle,
  placeholder,
  secureTextEntry,
  ...restProps
}) => {
  const c = useDesign();
  const [focused, setFocused] = useState(false);
  const theme = useResolvedTheme();
  const isDarkMode = theme === 'dark';
  const [showPassword, setShowPassword] = useState(false);

  const inputBackgroundColor = c.well;
  const inputTextColor = isDarkMode ? Colors.dark.typography[800] : Colors.light.typography[950];
  const placeholderTextColor = isDarkMode ? Colors.dark.typography[400] : Colors.light.typography[400];
  // The reviewed palette's danger, not the legacy error[500] scale: that scale
  // was never redirected onto the design tokens, which made validation copy the
  // one red in the app that does not match the approved colours.
  const errorTextColor = c.danger;
  const iconColor = isDarkMode ? Colors.dark.typography[600] : Colors.light.typography[600];

  const isPasswordInput = secureTextEntry === true;

  return (
    <View style={[styles.container, containerStyle]}>
      {title ? (
        <View style={styles.title}>
          <FieldLabel>{title}</FieldLabel>
        </View>
      ) : null}

      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: inputBackgroundColor,
            borderColor: error ? errorTextColor : focused ? c.tint : 'transparent',
          },
          inputContainerStyle,
        ]}
      >
        <AdaptiveTextInput
          style={[
            styles.input,
            { color: inputTextColor },
            isPasswordInput && { paddingRight: t.height.touch },
            inputStyle,
          ]}
          placeholder={placeholder}
          placeholderTextColor={placeholderTextColor}
          secureTextEntry={isPasswordInput && !showPassword}
          accessibilityLabel={restProps.accessibilityLabel ?? placeholder ?? title}
          {...restProps}
          onFocus={(event) => {
            setFocused(true);
            restProps.onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            restProps.onBlur?.(event);
          }}
        />

        {isPasswordInput ? (
          <Pressable
            className="active:opacity-pressed"
            accessibilityRole="button"
            accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
            style={styles.eyeIcon}
            onPress={() => setShowPassword(!showPassword)}
          >
            {showPassword ? (
              <EyeOff strokeWidth={iconStroke(t.icon.medium)} size={t.icon.medium} color={iconColor} />
            ) : (
              <Eye strokeWidth={iconStroke(t.icon.medium)} size={t.icon.medium} color={iconColor} />
            )}
          </Pressable>
        ) : null}
      </View>

      {error ? (
        <Copy size="label" style={[styles.error, { color: errorTextColor }, errorStyle]}>
          {error}
        </Copy>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 0,
  },
  title: {
    marginBottom: t.layout.label,
  },
  inputContainer: {
    borderWidth: 1,
    borderRadius: t.radius.control,
    overflow: 'hidden',
    position: 'relative',
  },
  input: {
    height: t.height.touch - 2,
    textAlignVertical: 'center',
    paddingVertical: 0,
    includeFontPadding: false,
    paddingHorizontal: t.layout.field,
    fontSize: t.type.body,
  },
  error: {
    marginTop: t.layout.label,
  },
  eyeIcon: {
    position: 'absolute',
    right: 0,
    width: t.height.touch,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
