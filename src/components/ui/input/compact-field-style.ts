import { designTokens as t } from '@/constants/design-tokens';
import type { TextInputProps, TextStyle } from 'react-native';

/** Node-editor density for InputField: compact type and geometry, tabular digits for numbers. */
export function compactFieldStyle(keyboardType?: TextInputProps['keyboardType']): TextStyle {
  return {
    ...t.node.body,
    height: t.height.control,
    paddingHorizontal: t.node.inset,
    paddingVertical: 0,
    // Input paints the compact well as an absolute sibling. Native draws
    // siblings in order, but CSS paints positioned boxes over static ones, so
    // on web the well covered the field's text. `relative` is RN's default.
    position: 'relative',
    ...(keyboardType === 'numeric' || keyboardType === 'numbers-and-punctuation'
      ? { fontVariant: ['tabular-nums'] }
      : {}),
  };
}
