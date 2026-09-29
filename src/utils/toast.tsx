import { useDesign } from '@/components/ui/design-system/primitives';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { designTokens as t, type DesignColors } from '@/constants/design-tokens';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react-native';
import { StyleSheet, TextStyle, View, ViewStyle } from 'react-native';
import Toast from 'react-native-toast-message';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
 * Generates theme-specific styles for toast components
 */
const getThemedStyles = (c: DesignColors): ThemedStyles =>
  StyleSheet.create({
    container: {
      marginHorizontal: t.layout.inset,
      minWidth: 320,
      borderRadius: t.radius.panel,
      paddingVertical: t.layout.rowY,
      paddingHorizontal: t.layout.rowX,
    },
    successContainer: {
      backgroundColor: c.overlay,
    },
    errorContainer: {
      backgroundColor: c.overlay,
    },
    infoContainer: {
      backgroundColor: c.overlay,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    icon: {
      // Centres the control-size icon on the title's first line.
      marginTop: (t.leading.body - t.icon.control) / 2,
      marginRight: t.layout.related,
    },
    content: {
      flex: 1,
    },
    title: {
      fontFamily: t.font.semibold,
      fontSize: t.type.body,
      lineHeight: t.leading.body,
      fontWeight: '400',
      letterSpacing: 0.1,
      marginBottom: t.layout.label,
    },
    message: {
      fontFamily: t.font.sans,
      fontSize: t.type.label,
      lineHeight: t.leading.label,
      color: c.secondary,
      letterSpacing: 0.1,
    },
    successText: {
      color: c.ink,
    },
    successAccent: {
      color: c.ink,
    },
    errorText: {
      color: c.ink,
    },
    errorAccent: {
      color: c.danger,
    },
    infoText: {
      color: c.ink,
    },
    infoAccent: {
      color: c.ink,
    },
  });

/**
 * Toast bodies. Declared as named components rather than inline in the config
 * object: they call useDesign, and a lowercase key made the hooks lint
 * read them as plain functions calling a hook illegally.
 */
const SuccessToast = ({ text1, text2 }: CustomToastProps) => {
    const c = useDesign();
    const styles = getThemedStyles(c);

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
              <Text style={styles.message}>{text2}</Text>
            )}
          </View>
        </View>
      </View>
    );
};

const ErrorToast = ({ text1, text2 }: CustomToastProps) => {
    const c = useDesign();
    const styles = getThemedStyles(c);

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
              <Text style={styles.message}>{text2}</Text>
            )}
          </View>
        </View>
      </View>
    );
};

const InfoToast = ({ text1, text2 }: CustomToastProps) => {
    const c = useDesign();
    const styles = getThemedStyles(c);

    return (
      <View style={[styles.container, styles.infoContainer]}>
        <View style={styles.row}>
          <Icon as={Info} size="sm" style={[styles.icon, styles.infoAccent]} />
          <View style={styles.content}>
            <Text style={[styles.title, styles.infoText]}>{text1}</Text>
            {text2 && (
              <Text style={styles.message}>{text2}</Text>
            )}
          </View>
        </View>
      </View>
    );
};

const toastConfig = {
  success: SuccessToast,
  error: ErrorToast,
  info: InfoToast,
};

/**
 * Utility object for showing different types of toasts
 */
export const showToast = {
  /**
   * Shows a success toast message
   * @param title - The main message to display
   * @param message - Optional secondary message
   */
  success: (title: string, message?: string): void => {
    Toast.show({
      type: 'success',
      text1: title,
      text2: message,
      position: 'top',
      visibilityTime: 3000,
    });
  },

  /**
   * Shows an error toast message
   * @param title - The main message to display
   * @param message - Optional secondary message
   */
  error: (title: string, message?: string): void => {
    Toast.show({
      type: 'error',
      text1: title,
      text2: message,
      position: 'top',
      visibilityTime: 3000,
    });
  },

  /**
   * Shows an info toast message
   * @param title - The main message to display
   * @param message - Optional secondary message
   */
  info: (title: string, message?: string): void => {
    Toast.show({
      type: 'info',
      text1: title,
      text2: message,
      position: 'top',
      visibilityTime: 3000,
    });
  },
};

export { toastConfig };

/** Every native modal host shares the same safe-area positioning contract. */
export function AppToast() {
  const insets = useSafeAreaInsets();
  return <Toast config={toastConfig} topOffset={insets.top + 8} bottomOffset={insets.bottom + 8} />;
}
