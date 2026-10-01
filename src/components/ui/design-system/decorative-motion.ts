import { useEffect, useState } from 'react';
import { AccessibilityInfo, AppState } from 'react-native';
import { useIsFocused } from 'expo-router/react-navigation';
import {
  cancelAnimation,
  Easing,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { designTokens as t } from '@/constants/design-tokens';

/**
 * A 0–1 phase that loops once per `t.motion.breathe` for decorative state
 * indicators. It rests at `rest` under Reduce Motion, off screen and while the
 * app is in the background, so illustrations hold a meaningful still frame.
 */
export function useDecorativeMotion(rest = 0): SharedValue<number> {
  const focused = useIsFocused();
  const initiallyReduced = useReducedMotion();
  const [reduced, setReduced] = useState(initiallyReduced);
  const [active, setActive] = useState(AppState.currentState === 'active');
  const phase = useSharedValue(rest);
  useEffect(() => {
    const app = AppState.addEventListener('change', (state) => setActive(state === 'active'));
    const motion = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => {
      app.remove();
      motion.remove();
    };
  }, []);
  const animated = focused && active && !reduced;
  useEffect(() => {
    if (!animated) {
      cancelAnimation(phase);
      phase.set(rest);
      return;
    }
    phase.set(0);
    phase.set(withRepeat(withTiming(1, { duration: t.motion.breathe, easing: Easing.linear }), -1, false));
    return () => cancelAnimation(phase);
  }, [animated, phase, rest]);
  return phase;
}
