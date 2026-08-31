import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { useEffect } from 'react';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

/**
 * Status, stated rather than decorated.
 *
 * A solid dot means reachable, a hollow ring means offline, and a slow breath
 * means something is running — that breath is the only permanent animation in
 * the app, so it reads as activity rather than noise. There is no tinted
 * capsule behind any of it: the word and the number carry the meaning, and
 * colour only confirms it.
 */
export type StatusTone = 'ready' | 'busy' | 'downloading' | 'offline' | 'error';

/** Solid fill for live states; `offline` is drawn as a ring instead. */
const DOT: Record<StatusTone, string> = {
  ready: 'bg-status-online',
  busy: 'bg-status-busy',
  downloading: 'bg-status-downloading',
  offline: 'border border-ink/40',
  error: 'bg-status-danger',
};

const LABEL: Record<StatusTone, string> = {
  ready: 'text-content-secondary',
  busy: 'text-content-secondary',
  downloading: 'text-content-secondary',
  offline: 'text-content-tertiary',
  error: 'text-status-danger',
};

/** The one animation that never stops while it applies. */
const BREATH_MS = 1400;

interface StatusDotProps {
  tone: StatusTone;
  /** Breathes the dot. Use only while something is genuinely in flight. */
  pulse?: boolean;
  size?: number;
  className?: string;
}

export function StatusDot({ tone, pulse = false, size = 7, className }: StatusDotProps) {
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (!pulse) {
      opacity.value = 1;
      return;
    }
    // 2.8s round trip — slow enough to read as breathing, not blinking.
    opacity.value = withRepeat(
      withTiming(0.25, { duration: BREATH_MS, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
    return () => {
      cancelAnimation(opacity);
      opacity.value = 1;
    };
  }, [pulse, opacity]);

  const breath = useAnimatedStyle(() => ({ opacity: opacity.value }));

  // The className goes on a plain View, not on Animated.View: NativeWind only
  // reliably resolves classes on components it has interop for, and on web the
  // reanimated wrapper silently drops them — which rendered every status dot
  // invisible. The animated wrapper carries style only.
  return (
    <Animated.View style={breath} className={className}>
      <View className={`rounded-full ${DOT[tone]}`} style={{ width: size, height: size }} />
    </Animated.View>
  );
}

interface StatusPillProps {
  tone: StatusTone;
  /** The word. Sentence case, calm — "Ready", "Generating", "Offline". */
  children: React.ReactNode;
  /** Any number that belongs to the state: "38 ms", "3 queued", "42%". */
  value?: string;
  pulse?: boolean;
  className?: string;
}

/** Dot, word, and — set apart in mono — the number that qualifies it. */
export function StatusPill({ tone, children, value, pulse = false, className }: StatusPillProps) {
  return (
    <View className={`flex-row items-center gap-2 ${className ?? ''}`}>
      <StatusDot tone={tone} pulse={pulse} />
      <Text className={`text-xs ${LABEL[tone]}`}>{children}</Text>
      {value ? <Text className="font-mono text-xs text-content-tertiary">· {value}</Text> : null}
    </View>
  );
}
