import { Circle, Line, Rect } from 'react-native-svg';
import Animated, { useAnimatedProps, type SharedValue } from 'react-native-reanimated';
import { useDesign } from '@/components/ui/design-system/primitives';
import { useDecorativeMotion } from '@/components/ui/design-system/decorative-motion';
import { pulse } from '@/components/ui/design-system/decorative-pulse';
import { EMPTY_ART_STROKE as STROKE, EmptyStateArt } from '@/components/ui/design-system/empty-state-art';
import { designTokens as t } from '@/constants/design-tokens';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedLine = Animated.createAnimatedComponent(Line);

const UNIT = { x: 28, width: 64, height: 18 };
const UNITS = [
  { y: 8, peak: 0.25 },
  { y: 32, peak: 0.75 },
];
const CABLE_X = 60;
const DASH = 2;

/** A status light that glows once per cycle, centred on `peak` (0–1). */
function StatusLight({
  cy,
  peak,
  phase,
  color,
}: {
  cy: number;
  peak: number;
  phase: SharedValue<number>;
  color: string;
}) {
  const props = useAnimatedProps(() => ({ fillOpacity: 0.2 + 0.8 * pulse(phase.get(), peak) }));
  return <AnimatedCircle cx={UNIT.x + 11} cy={cy} r={1.75} fill={color} animatedProps={props} />;
}

/**
 * Two rack units waiting for a link: their status lights take turns and the
 * loose cable below carries a faint signal towards an unplugged connector.
 */
export function EmptyServersArt() {
  const c = useDesign();
  const phase = useDecorativeMotion(0.25);
  const cable = useAnimatedProps(() => ({ strokeDashoffset: -phase.get() * DASH * 2 * 3 }));
  const line = { stroke: c.faint, strokeWidth: STROKE };
  const bottom = UNITS[1].y + UNIT.height;
  return (
    <EmptyStateArt testID="empty-servers-art" readout="NO LINK">
      {UNITS.map(({ y, peak }) => {
        const cy = y + UNIT.height / 2;
        return [
          <Rect key={`unit${y}`} {...UNIT} y={y} rx={t.radius.small} fill={c.well} {...line} />,
          ...[UNIT.x + 4, UNIT.x + UNIT.width - 4].map((cx) => (
            <Circle key={`screw${y}${cx}`} cx={cx} cy={cy} r={1.25} fill="none" {...line} />
          )),
          ...[-2.5, 2.5].map((dy) => (
            <Line key={`bay${y}${dy}`} x1={UNIT.x + 24} x2={UNIT.x + 52} y1={cy + dy} y2={cy + dy} {...line} />
          )),
          <StatusLight key={`light${y}`} cy={cy} peak={peak} phase={phase} color={c.ink} />,
        ];
      })}
      <AnimatedLine
        x1={CABLE_X}
        x2={CABLE_X}
        y1={bottom}
        y2={bottom + 12}
        stroke={c.muted}
        strokeWidth={STROKE}
        strokeDasharray={`${DASH} ${DASH}`}
        animatedProps={cable}
      />
      <Rect x={CABLE_X - 4} y={bottom + 12} width={8} height={5} fill="none" {...line} />
      <Line x1={CABLE_X - 2} x2={CABLE_X + 2} y1={bottom + 19} y2={bottom + 19} {...line} />
    </EmptyStateArt>
  );
}
