import { Circle, Line, Rect } from 'react-native-svg';
import Animated, { useAnimatedProps, type SharedValue } from 'react-native-reanimated';
import { useDesign } from '@/components/ui/design-system/primitives';
import { useDecorativeMotion } from '@/components/ui/design-system/decorative-motion';
import { pulse } from '@/components/ui/design-system/decorative-pulse';
import { EMPTY_ART_STROKE as STROKE, EmptyStateArt } from '@/components/ui/design-system/empty-state-art';
import { designTokens as t } from '@/constants/design-tokens';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const CARD = { x: 36, y: 10, width: 48, height: 50 };
const CLIP = { x: 52, y: 7, width: 16, height: 6 };
const MARK_X = CARD.x + 8;
const TEXT_X = CARD.x + 14;
/** Model, extension and workflow: one slot each, filling in turn. */
const SLOTS = [
  { cy: 29, end: 78, peak: 1 / 6 },
  { cy: 39, end: 72, peak: 1 / 2 },
  { cy: 49, end: 76, peak: 5 / 6 },
];

/** A slot's mark, lit once per cycle around `peak` (0–1). */
function SlotMark({ cy, peak, phase, color }: { cy: number; peak: number; phase: SharedValue<number>; color: string }) {
  const props = useAnimatedProps(() => ({ fillOpacity: 0.15 + 0.85 * pulse(phase.get(), peak, 0.2) }));
  return <AnimatedCircle cx={MARK_X} cy={cy} r={1.25} fill={color} animatedProps={props} />;
}

/**
 * A blank recipe on a clipboard: its three slots (model, extension, workflow)
 * light in turn, as if the recipe were being put together.
 */
export function EmptyEnvironmentsArt() {
  const c = useDesign();
  const phase = useDecorativeMotion(SLOTS[0].peak);
  const line = { stroke: c.faint, strokeWidth: STROKE };
  return (
    <EmptyStateArt testID="empty-environments-art" readout="NO RECIPE">
      <Rect {...CARD} rx={t.radius.small} fill={c.well} {...line} />
      <Rect {...CLIP} rx={t.radius.small} fill={c.well} {...line} />
      <Line x1={MARK_X - 2.5} x2={CARD.x + 26} y1={20} y2={20} stroke={c.muted} strokeWidth={STROKE} />
      {SLOTS.map(({ cy, end, peak }) => [
        <Circle key={`ring${cy}`} cx={MARK_X} cy={cy} r={2.5} fill="none" {...line} />,
        <Line key={`text${cy}`} x1={TEXT_X} x2={end} y1={cy} y2={cy} {...line} />,
        <SlotMark key={`mark${cy}`} cy={cy} peak={peak} phase={phase} color={c.ink} />,
      ])}
    </EmptyStateArt>
  );
}
