import { useId, useRef, useState } from 'react';
import { ScrollView, View, type LayoutRectangle, type LayoutChangeEvent } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { MotiView } from 'moti';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, withTiming } from 'react-native-reanimated';
import { Pressable } from '@/components/ui/pressable';
import { useDesign } from './primitives';
import { designTokens as t } from '@/constants/design-tokens';

interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

/** Compact filter surfaces retain separate, nonoverlapping 44-point touch targets. */
export function FilterChips({
  options,
  value,
  onChange,
  label,
}: {
  options: FilterOption[];
  value: string;
  onChange: (value: string) => void;
  label: string;
}) {
  const c = useDesign();
  const reduced = useReducedMotion();
  const [layouts, setLayouts] = useState<Record<string, LayoutRectangle>>({});
  const selectedLayout = layouts[value];
  const measurements = useRef({ viewport: 0, content: 0, offset: 0 });
  const [edges, setEdges] = useState({ left: 0, right: 0 });
  const updateEdges = () => {
    const { viewport, content, offset } = measurements.current;
    const maximum = Math.max(0, content - viewport);
    const position = Math.max(0, Math.min(offset, maximum));
    // Only the last few points of a drag change the cue's strength. Across the
    // rest of the scroll range these values stay at 1, avoiding extra renders.
    const strength = (distance: number) =>
      viewport > 0 ? Math.min(1, Math.max(0, (distance - 1) / t.layout.inset)) : 0;
    const left = strength(position);
    const right = strength(maximum - position);
    setEdges((previous) => (previous.left === left && previous.right === right ? previous : { left, right }));
  };
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
      style={{
        width: '100%',
        maxWidth: '100%',
        minWidth: 0,
        minHeight: t.height.touch,
        flexShrink: 0,
        overflow: 'hidden',
        position: 'relative',
      }}
      onLayout={(event) => {
        measurements.current.viewport = event.nativeEvent.layout.width;
        updateEdges();
      }}
    >
      <ScrollView
        horizontal
        testID="filter-scroll"
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0, minWidth: 0 }}
        scrollEventThrottle={16}
        onContentSizeChange={(width) => {
          measurements.current.content = width;
          updateEdges();
        }}
        onScroll={(event) => {
          measurements.current.offset = event.nativeEvent.contentOffset.x;
          updateEdges();
        }}
        contentContainerStyle={{ gap: t.layout.list, alignItems: 'center' }}
      >
        {selectedLayout && (
          <MotiView
            pointerEvents="none"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            animate={{ translateX: selectedLayout.x, width: selectedLayout.width }}
            transition={{ type: 'timing', duration: reduced ? 0 : t.motion.base, easing: Easing.out(Easing.cubic) }}
            style={{
              position: 'absolute',
              left: 0,
              top: (t.height.touch - t.height.small) / 2,
              height: t.height.small,
              borderRadius: t.radius.choice,
              backgroundColor: c.tintSurface,
            }}
          />
        )}
        {options.map((option) => (
          <Chip
            key={option.value}
            option={option}
            onLayout={(event) => {
              const layout = event.nativeEvent.layout;
              setLayouts((previous) => {
                const old = previous[option.value];
                return old?.x === layout.x && old?.width === layout.width
                  ? previous
                  : { ...previous, [option.value]: layout };
              });
            }}
            selected={option.value === value}
            onPress={() => onChange(option.value)}
          />
        ))}
      </ScrollView>
      <EdgeFade side="left" opacity={edges.left} />
      <EdgeFade side="right" opacity={edges.right} />
    </View>
  );
}

/** A passive overflow cue; fades appear only on sides with more scrollable content. */
function EdgeFade({ side, opacity }: { side: 'left' | 'right'; opacity: number }) {
  const c = useDesign();
  const reduced = useReducedMotion();
  const gradientId = `filter-edge-${useId().replace(/:/g, '')}`;
  return (
    <MotiView
      testID={`filter-fade-${side}`}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      from={{ opacity: 0 }}
      animate={{ opacity }}
      transition={{ type: 'timing', duration: reduced ? 0 : t.motion.fast, easing: Easing.out(Easing.cubic) }}
      style={{ position: 'absolute', top: 0, bottom: 0, [side]: 0, width: t.layout.inset }}
    >
      <Svg width="100%" height="100%" viewBox={`0 0 ${t.layout.inset} ${t.height.touch}`} preserveAspectRatio="none">
        <Defs>
          <LinearGradient
            id={gradientId}
            x1={side === 'left' ? '0%' : '100%'}
            x2={side === 'left' ? '100%' : '0%'}
            y1="0%"
            y2="0%"
          >
            {/* A soft shoulder and a long transparent tail blend the clipped
                edge without laying a broad, linear veil over the chip. */}
            {[
              [0, 1],
              [0.1, 0.96],
              [0.25, 0.78],
              [0.4, 0.5],
              [0.55, 0.22],
              [0.7, 0.065],
              [0.85, 0.008],
              [1, 0],
            ].map(([offset, alpha]) => (
              <Stop key={offset} offset={offset} stopColor={c.paper} stopOpacity={alpha} />
            ))}
          </LinearGradient>
        </Defs>
        <Rect width={t.layout.inset} height={t.height.touch} fill={`url(#${gradientId})`} />
      </Svg>
    </MotiView>
  );
}

function Chip({
  option,
  selected,
  onPress,
  onLayout,
}: {
  option: FilterOption;
  selected: boolean;
  onPress: () => void;
  onLayout: (event: LayoutChangeEvent) => void;
}) {
  const c = useDesign();
  const reduced = useReducedMotion();
  const labelStyle = useAnimatedStyle(() => ({
    color: withTiming(selected ? c.tint : c.secondary, { duration: reduced ? 0 : t.motion.fast }),
  }));
  const countStyle = useAnimatedStyle(() => ({
    color: withTiming(selected ? c.tint : c.muted, { duration: reduced ? 0 : t.motion.fast }),
  }));

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={option.label}
      accessibilityState={{ checked: selected }}
      aria-checked={selected}
      onPress={onPress}
      onLayout={onLayout}
      style={{ minHeight: t.height.touch, minWidth: t.height.touch, justifyContent: 'center' }}
    >
      <View
        pointerEvents="none"
        style={{
          height: t.height.small,
          paddingHorizontal: t.layout.rowX,
          borderRadius: t.radius.choice,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: t.layout.label,
          backgroundColor: 'transparent',
        }}
      >
        <Animated.Text
          style={[{ fontFamily: t.font.medium, fontSize: t.type.label, lineHeight: t.leading.label }, labelStyle]}
        >
          {option.label}
        </Animated.Text>
        {option.count !== undefined && (
          <Animated.Text
            style={[
              {
                fontFamily: t.font.sans,
                fontSize: t.type.micro,
                lineHeight: t.leading.micro,
                fontVariant: ['tabular-nums'],
              },
              countStyle,
            ]}
          >
            {option.count}
          </Animated.Text>
        )}
      </View>
    </Pressable>
  );
}
