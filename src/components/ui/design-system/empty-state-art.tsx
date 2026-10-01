import React from 'react';
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { designTokens as t } from '@/constants/design-tokens';
import { Copy, useDesign } from './primitives';

/** Drawing area shared by every empty-state illustration; the readout sits below it. */
export const EMPTY_ART = { width: 120, height: 72 } as const;
/**
 * Technical-drawing hairline. Empty-state art is line work, not an enlarged
 * icon, so it stays at half the weight of the smallest icon stroke.
 */
export const EMPTY_ART_STROKE = 0.75;
const MARK = 4;

/** Faint corner registration marks framing the drawing area. */
function RegistrationMarks({ color }: { color: string }) {
  const { width: w, height: h } = EMPTY_ART;
  const inset = EMPTY_ART_STROKE / 2;
  const d = [
    `M ${inset} ${MARK} V ${inset} H ${MARK}`,
    `M ${w - MARK} ${inset} H ${w - inset} V ${MARK}`,
    `M ${inset} ${h - MARK} V ${h - inset} H ${MARK}`,
    `M ${w - MARK} ${h - inset} H ${w - inset} V ${h - MARK}`,
  ].join(' ');
  return <Path d={d} fill="none" stroke={color} strokeWidth={EMPTY_ART_STROKE} />;
}

/**
 * Frame for an empty-state illustration: a hairline drawing with registration
 * marks and a mono-caps panel readout. Decorative only; hidden from
 * accessibility and touch. Children are SVG elements in EMPTY_ART coordinates.
 */
export function EmptyStateArt({
  testID,
  readout,
  children,
}: React.PropsWithChildren<{ testID: string; readout: string }>) {
  const c = useDesign();
  return (
    <View
      testID={testID}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ alignItems: 'center', gap: t.layout.label }}
    >
      <Svg width={EMPTY_ART.width} height={EMPTY_ART.height} viewBox={`0 0 ${EMPTY_ART.width} ${EMPTY_ART.height}`}>
        <RegistrationMarks color={c.faint} />
        {children}
      </Svg>
      <Copy mono muted size="micro">
        {readout}
      </Copy>
    </View>
  );
}
