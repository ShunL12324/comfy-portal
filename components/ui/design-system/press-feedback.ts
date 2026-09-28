import { useState } from 'react';
import { useReducedMotion } from 'react-native-reanimated';
import { designTokens as t } from '@/constants/design-tokens';

/**
 * The one press treatment: a slight fade of the whole surface, never a scale
 * or a colour change. Buttons and pressable cards share it so a tap feels the
 * same everywhere; feed `animate`/`transition` to a MotiView.
 */
export function usePressFeedback() {
  const [pressed, setPressed] = useState(false);
  const reduced = useReducedMotion();
  return {
    pressed,
    onPressIn: () => setPressed(true),
    onPressOut: () => setPressed(false),
    animate: { opacity: pressed ? t.opacity.pressed : 1 },
    transition: { type: 'timing' as const, duration: reduced ? 0 : t.motion.press },
  };
}
