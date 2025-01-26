import { View, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import Toast from 'react-native-toast-message';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react-native';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useThemeStore } from '@/store/theme';

/**
 * Props for custom toast components
 */
interface CustomToastProps {
  text1?: string;
  text2?: string;
  props?: Record<string, unknown>;
}

/**
 * Theme-specific style properties
 */
interface ThemedStyles {
  container: ViewStyle;
  successContainer: ViewStyle;
  errorContainer: ViewStyle;
  infoContainer: ViewStyle;
  row: ViewStyle;
  icon: ViewStyle;
  content: ViewStyle;
  title: TextStyle;
  message: TextStyle;
  successText: TextStyle;
  successAccent: TextStyle;
  errorText: TextStyle;
  errorAccent: TextStyle;
  infoText: TextStyle;
  infoAccent: TextStyle;
}

/**
 * Toast configuration options
 */
interface ToastOptions {
  type: 'success' | 'error' | 'info';
  text1: string;
  text2?: string;
  position: 'top' | 'bottom';
  visibilityTime: number;
  topOffset: number;
}

/**
 * Generates theme-specific styles for toast components
 */
const getThemedStyles = (isDark: boolean): ThemedStyles =>
  StyleSheet.create({
    container: {
      marginHorizontal: 16,
      minWidth: 320,
      borderRadius: 10,
      paddingVertical: 10,
      paddingHorizontal: 14,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.2 : 0.08,
      shadowRadius: 4,
      elevation: 3,
    },
    successContainer: {
      backgroundColor: isDark ? '#1c1c1c' : '#F0FDF4',
    },
    errorContainer: {
      backgroundColor: isDark ? '#1c1c1c' : '#FEF2F2',
    },
    infoContainer: {
      backgroundColor: isDark ? '#1c1c1c' : '#F0F9FF',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    icon: {
      marginTop: 2,
      marginRight: 10,
    },
    content: {
      flex: 1,
    },
    title: {
      fontSize: 13,
      fontWeight: '600',
      letterSpacing: 0.1,
      marginBottom: 2,
    },
    message: {
      fontSize: 12,
      lineHeight: 16,
      opacity: isDark ? 0.9 : 0.85,
      letterSpacing: 0.1,
    },
    successText: {
      color: isDark ? '#ffffff' : '#166534',
    },
    successAccent: {
      color: isDark ? '#4ade80' : '#166534',
    },
    errorText: {
      color: isDark ? '#ffffff' : '#991b1b',
    },
    errorAccent: {
      color: isDark ? '#f87171' : '#991b1b',
    },
    infoText: {
      color: isDark ? '#ffffff' : '#075985',
    },
    infoAccent: {
      color: isDark ? '#0D9DE3' : '#075985',
    },
  });

/**
 * Configuration for different toast types with their respective UI components
 */
const toastConfig = {
  success: ({ text1, text2 }: CustomToastProps) => {
    const theme = useThemeStore((state) => state.theme);
    const styles = getThemedStyles(theme === 'dark');

    return (
      <View style={[styles.container, styles.successContainer]}>
        <View style={styles.row}>
          <Icon
            as={CheckCircle2}
            size="sm"
            style={[styles.icon, styles.successAccent]}
          />
          <View style={styles.content}>
            <Text style={[styles.title, styles.successText]}>{text1}</Text>
            {text2 && (
              <Text style={[styles.message, styles.successText]}>{text2}</Text>
            )}
          </View>
        </View>
      </View>
    );
  },

  error: ({ text1, text2 }: CustomToastProps) => {
    const theme = useThemeStore((state) => state.theme);
    const styles = getThemedStyles(theme === 'dark');

    return (
      <View style={[styles.container, styles.errorContainer]}>
        <View style={styles.row}>
          <Icon
            as={AlertCircle}
            size="sm"
            style={[styles.icon, styles.errorAccent]}
          />
          <View style={styles.content}>
            <Text style={[styles.title, styles.errorText]}>{text1}</Text>
            {text2 && (
              <Text style={[styles.message, styles.errorText]}>{text2}</Text>
            )}
          </View>
        </View>
      </View>
    );
  },

  info: ({ text1, text2 }: CustomToastProps) => {
    const theme = useThemeStore((state) => state.theme);
    const styles = getThemedStyles(theme === 'dark');

    return (
      <View style={[styles.container, styles.infoContainer]}>
        <View style={styles.row}>
          <Icon as={Info} size="sm" style={[styles.icon, styles.infoAccent]} />
          <View style={styles.content}>
            <Text style={[styles.title, styles.infoText]}>{text1}</Text>
            {text2 && (
              <Text style={[styles.message, styles.infoText]}>{text2}</Text>
            )}
          </View>
        </View>
      </View>
    );
  },
};

/**
 * Utility object for showing different types of toasts
 */
export const showToast = {
  /**
   * Shows a success toast message
   * @param title - The main message to display
   * @param message - Optional secondary message
   * @param topOffset - Optional offset from the top of the screen
   */
  success: (title: string, message?: string, topOffset?: number): void => {
    Toast.show({
      type: 'success',
      text1: title,
      text2: message,
      position: 'top',
      visibilityTime: 3000,
      topOffset: topOffset ?? 16,
    });
  },

  /**
   * Shows an error toast message
   * @param title - The main message to display
   * @param message - Optional secondary message
   * @param topOffset - Optional offset from the top of the screen
   */
  error: (title: string, message?: string, topOffset?: number): void => {
    Toast.show({
      type: 'error',
      text1: title,
      text2: message,
      position: 'top',
      visibilityTime: 3000,
      topOffset: topOffset ?? 16,
    });
  },

  /**
   * Shows an info toast message
   * @param title - The main message to display
   * @param message - Optional secondary message
   * @param topOffset - Optional offset from the top of the screen
   */
  info: (title: string, message?: string, topOffset?: number): void => {
    Toast.show({
      type: 'info',
      text1: title,
      text2: message,
      position: 'top',
      visibilityTime: 3000,
      topOffset: topOffset ?? 16,
    });
  },
};

export { toastConfig };
