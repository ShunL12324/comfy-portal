import { Line, Path, Rect } from 'react-native-svg';
import Animated, { useAnimatedProps } from 'react-native-reanimated';
import { useDesign } from '@/components/ui/design-system/primitives';
import { useDecorativeMotion } from '@/components/ui/design-system/decorative-motion';
import { EMPTY_ART_STROKE as STROKE, EmptyStateArt } from '@/components/ui/design-system/empty-state-art';
import { designTokens as t } from '@/constants/design-tokens';

const AnimatedLine = Animated.createAnimatedComponent(Line);

/** A 4:3 viewfinder centred in the drawing area. */
const FRAME = { x: 28, y: 8, width: 64, height: 48 };
const CROP = 6;
const CROP_INSET = 4;
const CROSS = 3;

/** An empty viewfinder: crop marks, a centre cross and a slow scan line passing through it. */
export function EmptyGalleryArt() {
  const c = useDesign();
  const phase = useDecorativeMotion(0.35);
  const top = FRAME.y + CROP_INSET;
  const travel = FRAME.height - CROP_INSET * 2;
  const scan = useAnimatedProps(() => {
    const y = top + phase.get() * travel;
    return { y1: y, y2: y };
  });
  const left = FRAME.x + CROP_INSET;
  const right = FRAME.x + FRAME.width - CROP_INSET;
  const bottom = FRAME.y + FRAME.height - CROP_INSET;
  const crop = [
    `M ${left} ${top + CROP} V ${top} H ${left + CROP}`,
    `M ${right - CROP} ${top} H ${right} V ${top + CROP}`,
    `M ${left} ${bottom - CROP} V ${bottom} H ${left + CROP}`,
    `M ${right - CROP} ${bottom} H ${right} V ${bottom - CROP}`,
  ].join(' ');
  const cx = FRAME.x + FRAME.width / 2;
  const cy = FRAME.y + FRAME.height / 2;
  const dim = FRAME.y + FRAME.height + 8;
  return (
    <EmptyStateArt testID="empty-gallery-art" readout="0 OUTPUTS">
      <Rect {...FRAME} rx={t.radius.control} fill={c.well} stroke={c.faint} strokeWidth={STROKE} />
      <Path d={crop} fill="none" stroke={c.muted} strokeWidth={STROKE} />
      <Path
        d={`M ${cx - CROSS} ${cy} H ${cx + CROSS} M ${cx} ${cy - CROSS} V ${cy + CROSS}`}
        stroke={c.faint}
        strokeWidth={STROKE}
      />
      <AnimatedLine x1={left} x2={right} stroke={c.ink} strokeWidth={STROKE} animatedProps={scan} />
      {/* Dimension line under the frame, with end ticks. */}
      <Path
        d={`M ${FRAME.x} ${dim - 2} V ${dim + 2} M ${FRAME.x} ${dim} H ${FRAME.x + FRAME.width} M ${FRAME.x + FRAME.width} ${dim - 2} V ${dim + 2}`}
        stroke={c.faint}
        strokeWidth={STROKE}
      />
    </EmptyStateArt>
  );
}
