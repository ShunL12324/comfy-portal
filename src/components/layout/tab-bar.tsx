import { Copy, useDesign } from '@/components/ui/design-system/primitives';
import { Pressable } from '@/components/ui/pressable';
import { View } from '@/components/ui/view';
import { Images, LayoutTemplate, Server, Settings } from '@/constants/icons';
import { useEffect, useRef, useState } from 'react';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { designTokens as t, iconStroke } from '@/constants/design-tokens';
export type TabRoute = 'server' | 'gallery' | 'explore' | 'setting';
const items = [
  { id: 'server', title: 'Servers', icon: Server },
  { id: 'gallery', title: 'Gallery', icon: Images },
  { id: 'explore', title: 'Environments', icon: LayoutTemplate },
  { id: 'setting', title: 'Settings', icon: Settings },
] as const;
export function TabBar({ activeTab, onChangeTab }: { activeTab: TabRoute; onChangeTab: (tab: TabRoute) => void }) {
  const c = useDesign();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const [width, setWidth] = useState(0);
  const left = useSharedValue(0);
  const right = useSharedValue(16);
  const previousWidth = useRef(0);
  const index = items.findIndex((item) => item.id === activeTab);
  useEffect(() => {
    if (!width) return;
    const target = (width / items.length) * (index + 0.5) - 8;
    cancelAnimation(left);
    cancelAnimation(right);
    if (reduced || previousWidth.current !== width) {
      left.value = target;
      right.value = target + 16;
    } else {
      // Lead with the destination edge, then let the trailing edge catch up.
      // Interrupted navigation continues from the current presentation bounds.
      const movingRight = target + 8 >= (left.value + right.value) / 2;
      const timing = { duration: 190, easing: Easing.out(Easing.cubic) };
      left.value = movingRight ? withDelay(45, withTiming(target, timing)) : withTiming(target, timing);
      right.value = movingRight ? withTiming(target + 16, timing) : withDelay(45, withTiming(target + 16, timing));
    }
    previousWidth.current = width;
    return () => {
      cancelAnimation(left);
      cancelAnimation(right);
    };
  }, [index, width, reduced, left, right]);
  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: left.value }],
    width: Math.max(16, right.value - left.value),
  }));
  return (
    <View style={{ backgroundColor: c.paper, paddingBottom: insets.bottom }}>
      <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)} style={{ flexDirection: 'row' }}>
        {!!width && (
          <Animated.View
            testID="tab-indicator"
            pointerEvents="none"
            style={[
              {
                position: 'absolute',
                bottom: 2,
                left: 0,
                height: 2,
                borderRadius: t.radius.pill,
                backgroundColor: c.tint,
              },
              indicatorStyle,
            ]}
          />
        )}
        {items.map(({ id, title, icon: Icon }) => (
          <Pressable
            key={id}
            accessibilityRole="tab"
            accessibilityState={{ selected: id === activeTab }}
            accessibilityLabel={title}
            onPress={() => onChangeTab(id)}
            style={{
              flex: 1,
              minHeight: 56,
              paddingTop: t.layout.status,
              paddingBottom: t.layout.rowY,
              gap: t.layout.label,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon
              size={t.icon.medium}
              strokeWidth={iconStroke(t.icon.medium)}
              color={id === activeTab ? c.tint : c.muted}
            />
            <Copy size="micro" style={{ color: id === activeTab ? c.tint : c.muted, fontWeight: '500' }}>
              {title}
            </Copy>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
