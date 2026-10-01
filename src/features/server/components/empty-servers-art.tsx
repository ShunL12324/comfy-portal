import { useEffect, useState } from 'react';
import { AccessibilityInfo, AppState, View } from 'react-native';
import { useIsFocused } from 'expo-router/react-navigation';
import Svg, { Circle, Line, Rect } from 'react-native-svg';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useDesign } from '@/components/ui/design-system/primitives';
import { designTokens as t, iconStroke } from '@/constants/design-tokens';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedLine = Animated.createAnimatedComponent(Line);

const WIDTH = 96;
const HEIGHT = 80;
const CYCLE_MS = 2400;
const DASH = 3;
/** Line weight of an 18pt icon, so the drawing reads like the icon set. */
const STROKE = iconStroke(t.icon.medium);

/** A status light that glows once per cycle, centred on `peak` (0–1). */
function StatusLight({ cy, peak, phase, color }: { cy: number; peak: number; phase: SharedValue<number>; color: string }) {
  const props = useAnimatedProps(() => {
    const distance = Math.min(Math.abs(phase.get() - peak), 1 - Math.abs(phase.get() - peak));
    return { fillOpacity: 0.25 + 0.75 * Math.max(0, 1 - distance / 0.25) };
  });
  return <AnimatedCircle cx={30} cy={cy} r={2.5} fill={color} animatedProps={props} />;
}

/**
 * Two rack units waiting for a connection: their lights take turns and the
 * cable below carries a slow signal. Decorative only; still under Reduce
 * Motion, off screen and in the background.
 */
export function EmptyServersArt() {
  const c = useDesign();
  const focused = useIsFocused();
  const initiallyReduced = useReducedMotion();
  const [reduced, setReduced] = useState(initiallyReduced);
  const [active, setActive] = useState(AppState.currentState === 'active');
  const phase = useSharedValue(0.25);
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
      phase.set(0.25);
      return;
    }
    phase.set(0);
    phase.set(withRepeat(withTiming(1, { duration: CYCLE_MS, easing: Easing.linear }), -1, false));
    return () => cancelAnimation(phase);
  }, [animated, phase]);
  const cable = useAnimatedProps(() => ({ strokeDashoffset: -phase.get() * DASH * 2 * 4 }));
  const unit = { x: 18, width: 60, height: 20, rx: t.radius.small, fill: c.well, stroke: c.faint, strokeWidth: STROKE };
  return (
    <View
      testID="empty-servers-art"
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width: WIDTH, height: HEIGHT }}
    >
      <Svg width={WIDTH} height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
        <Rect y={8} {...unit} />
        <Rect y={34} {...unit} />
        {[18, 44].map((y) => (
          <Line key={y} x1={50} x2={68} y1={y} y2={y} stroke={c.faint} strokeWidth={STROKE} strokeLinecap="round" />
        ))}
        <StatusLight cy={18} peak={0.25} phase={phase} color={c.ink} />
        <StatusLight cy={44} peak={0.75} phase={phase} color={c.ink} />
        <AnimatedLine
          x1={48}
          x2={48}
          y1={56}
          y2={78}
          stroke={c.muted}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={`${DASH} ${DASH}`}
          animatedProps={cable}
        />
      </Svg>
    </View>
  );
}
