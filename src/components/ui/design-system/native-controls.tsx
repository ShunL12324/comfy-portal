import { MotiView } from 'moti';
import React, { memo } from 'react';
import { useReducedMotion } from 'react-native-reanimated';
import { Pressable } from '@/components/ui/pressable';
import { Switch as GluestackSwitch } from '@/components/ui/switch';
import { View as Box } from '@/components/ui/view';
import { designTokens as t, iconStroke } from '@/constants/design-tokens';
import type { LucideIcon } from '@/constants/icons';
import { Segments, useDesign } from './primitives';

/**
 * The single entry point for the app's toggle controls.
 *
 * Node parameters used to reach for three separate hand-drawn implementations
 * (a Reanimated switch, a RadioGroup segmented track, and a third icon track in
 * the Run sheet), so the same boolean read differently depending on which node
 * you opened. Everything now routes through this module: switches keep their native
 * integration, and segmented tracks use the reviewed design-system rendering.
 */

type SwitchSize = 'sm' | 'md' | 'lg';

// The native switch measures 51x31 before the size scale, which leaves the
// small variant well under the 44-point floor. Slop is expressed in the
// control's own coordinate space, so it is divided by the scale it will be
// rendered at; adding padding instead would move the row's layout.
const SWITCH_HIT_SLOP: Record<SwitchSize, { vertical: number; horizontal: number }> = {
  sm: { vertical: 14, horizontal: 4 },
  md: { vertical: 7, horizontal: 0 },
  lg: { vertical: 2, horizontal: 0 },
};

export function NativeSwitch({
  value,
  onValueChange,
  label,
  disabled = false,
  size = 'sm',
}: {
  value: boolean;
  onValueChange: (value: boolean) => void;
  label: string;
  disabled?: boolean;
  size?: SwitchSize;
}) {
  const c = useDesign();
  const slop = SWITCH_HIT_SLOP[size];

  return (
    <Box style={{ minHeight: t.height.touch, justifyContent: 'center' }}>
      <GluestackSwitch
        size={size}
        value={value}
        onValueChange={onValueChange}
        isDisabled={disabled}
        accessibilityRole="switch"
        accessibilityLabel={label}
        accessibilityState={{ checked: value, disabled }}
        aria-label={label}
        // Paint the platform widget with the design system's own roles so the
        // native control still belongs to the sheet it sits in.
        trackColor={{ false: c.boundary, true: c.tint }}
        thumbColor={value ? c.onTint : undefined}
        ios_backgroundColor={c.boundary}
        hitSlop={{
          top: slop.vertical,
          bottom: slop.vertical,
          left: slop.horizontal,
          right: slop.horizontal,
        }}
      />
    </Box>
  );
}

/**
 * Labelled enum choices share the reviewed Gluestack composition on all
 * platforms. UIKit's capsule track and thumb cannot both follow our small
 * corner tokens, so the node control uses Segments while switches stay native.
 */
export function NativeSegments({
  options,
  value,
  onChange,
  label = 'Selection',
  disabled = false,
}: {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
  disabled?: boolean;
}) {
  return <Segments options={options} value={value} onChange={onChange} label={label} disabled={disabled} />;
}

/**
 * Icon-only segmented choice, used by the Run sheet's Nodes / Assistant tabs.
 *
 * It shares this module's hit-area and accessibility conventions while keeping
 * the existing icon layout for the Run panel navigation.
 *
 * Memoised like the control it replaces: the Run screen re-renders steadily
 * while a generation is in flight, and the tabs only change on a tap.
 */
export const NativeIconSegments = memo(function NativeIconSegments({
  items,
  index,
  onChange,
  label = 'Selection',
}: {
  items: { label: string; icon: LucideIcon }[];
  index: number;
  onChange: (index: number) => void;
  label?: string;
}) {
  const c = useDesign();
  const reduced = useReducedMotion();
  const count = Math.max(1, items.length);
  const cell = t.height.touch;
  const width = cell * count;
  const inset = t.layout.badgeY;
  const thumbWidth = cell - inset * 2;
  const surfaceHeight = t.height.small;
  const trackHeight = surfaceHeight + inset * 2;

  return (
    <Box accessibilityRole="tablist" accessibilityLabel={label} style={{ width, height: t.height.touch }}>
      <Box
        testID="run-panel-track"
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: (t.height.touch - trackHeight) / 2,
          width,
          height: trackHeight,
          borderRadius: t.radius.pill,
          backgroundColor: c.workspaceCard,
        }}
      />
      <MotiView
        pointerEvents="none"
        animate={{ translateX: inset + index * cell }}
        transition={{ type: 'timing', duration: reduced ? 0 : t.motion.fast }}
        style={{
          position: 'absolute',
          top: (t.height.touch - surfaceHeight) / 2,
          width: thumbWidth,
          height: surfaceHeight,
          borderRadius: t.radius.pill,
          backgroundColor: c.tintSurface,
        }}
      />
      <Box style={{ flexDirection: 'row' }}>
        {items.map(({ label: itemLabel, icon: Icon }, item) => (
          <Pressable
            key={itemLabel}
            accessibilityRole="tab"
            accessibilityLabel={itemLabel}
            accessibilityState={{ selected: index === item }}
            onPress={() => onChange(item)}
            style={{ width: cell, height: t.height.touch, alignItems: 'center', justifyContent: 'center' }}
          >
            <Icon
              size={t.icon.control}
              strokeWidth={iconStroke(t.icon.control)}
              color={index === item ? c.tint : c.secondary}
            />
          </Pressable>
        ))}
      </Box>
    </Box>
  );
});
