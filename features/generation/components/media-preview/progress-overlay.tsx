import { useDesign } from '@/components/ui/design-system/primitives';
import { memo } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useDerivedValue,
  useReducedMotion,
  withTiming,
} from 'react-native-reanimated';
interface ProgressOverlayProps {
  current: number;
  total: number;
}
export const ProgressOverlay = memo(function ProgressOverlay({ current, total }: ProgressOverlayProps) {
  const c = useDesign();
  const reduced = useReducedMotion();
  const progress = useDerivedValue(
    () =>
      withTiming(total > 0 ? Math.max(0, Math.min(100, (current / total) * 100)) : 0, {
        duration: reduced ? 0 : 240,
        easing: Easing.linear,
      }),
    [current, total, reduced],
  );
  const animatedStyle = useAnimatedStyle(() => ({ width: `${progress.value}%` }));
  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, backgroundColor: c.line }}
    >
      <Animated.View style={[{ height: 2, backgroundColor: c.ink }, animatedStyle]} />
    </View>
  );
});
