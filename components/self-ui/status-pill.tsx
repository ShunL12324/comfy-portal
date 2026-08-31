import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { useEffect } from 'react';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

/**
 * The one place colour is allowed to carry meaning.
 *
 * Everything else in the app is neutral grey, so a hue here reads as state
 * rather than decoration: green up, orange working, blue transferring, red
 * broken, grey nothing-happening.
 */
export type StatusTone = 'ready' | 'busy' | 'downloading' | 'offline' | 'error';

/**
 * Dot and capsule colours are declared as whole class strings rather than
 * interpolated per tone. NativeWind resolves classes at build time by
 * scanning source text, so a constructed `bg-${tone}-100` only survives
 * because of a safelist regex in tailwind.config.js — spelling them out
 * keeps them findable and drops the indirection.
 *
 * No `dark:` variants: the colour scales in constants/Colors.ts invert
 * between themes, so `bg-success-100 text-success-700` is already a light
 * chip with dark text in light mode and the reverse in dark mode.
 */
const DOT: Record<StatusTone, string> = {
  ready: 'bg-status-online',
  busy: 'bg-status-busy',
  downloading: 'bg-status-downloading',
  offline: 'bg-status-offline',
  error: 'bg-status-danger',
};

const CAPSULE: Record<StatusTone, string> = {
  ready: 'bg-success-100',
  busy: 'bg-warning-100',
  downloading: 'bg-info-100',
  offline: 'bg-surface-sunken',
  error: 'bg-error-100',
};

const LABEL: Record<StatusTone, string> = {
  ready: 'text-success-700',
  busy: 'text-warning-700',
  downloading: 'text-info-700',
  offline: 'text-content-secondary',
  error: 'text-error-700',
};

interface StatusDotProps {
  tone: StatusTone;
  /** Fades the dot in and out. Use while something is genuinely in flight. */
  pulse?: boolean;
  /** Diameter in px. 8 standalone, 6 inside a pill. */
  size?: number;
  className?: string;
}

/** A bare state dot — beside a server name, a service row, an instance. */
export function StatusDot({ tone, pulse = false, size = 8, className }: StatusDotProps) {
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (!pulse) {
      opacity.value = 1;
      return;
    }
    // 500ms each way — one second a cycle, matching the app's other loops.
    opacity.value = withRepeat(withTiming(0.35, { duration: 500, easing: Easing.inOut(Easing.quad) }), -1, true);
    return () => {
      cancelAnimation(opacity);
      opacity.value = 1;
    };
  }, [pulse, opacity]);

  const pulseStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      className={`rounded-full ${DOT[tone]} ${className ?? ''}`}
      style={[{ width: size, height: size }, pulseStyle]}
    />
  );
}

interface StatusPillProps {
  tone: StatusTone;
  /** Sentence case, numbers inline: "Generating 64% (3/7)", "Downloading 42%". */
  children: React.ReactNode;
  pulse?: boolean;
  className?: string;
}

/** Dot plus label in a tinted capsule — server readiness, generation progress. */
export function StatusPill({ tone, children, pulse = false, className }: StatusPillProps) {
  return (
    <View className={`flex-row items-center gap-1 self-start rounded-full px-2 py-0.5 ${CAPSULE[tone]} ${className ?? ''}`}>
      <StatusDot tone={tone} pulse={pulse} size={6} />
      <Text className={`text-2xs font-medium ${LABEL[tone]}`}>{children}</Text>
    </View>
  );
}
