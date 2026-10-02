import { visibleRegionHeight } from '@/features/generation/utils/visible-region';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, type SharedValue } from 'react-native-reanimated';

/**
 * Fills the result area, then sizes its content box to the part above
 * `coverTop` (the node sheet's top edge, in the area's parent coordinates) so
 * media and placeholders centre in what the user can actually see. The box
 * tracks the sheet on the UI thread, so drags and detent snaps stay smooth.
 * Without a cover (iPad split layout) the box is the whole area. Render it as a
 * direct child of the sheet's container: its layout y is the area top.
 */
export function VisibleRegion({ coverTop, children }: { coverTop?: SharedValue<number>; children: React.ReactNode }) {
  const areaTop = useSharedValue(0);
  const areaHeight = useSharedValue(0);
  const regionStyle = useAnimatedStyle(() => {
    const height = areaHeight.get();
    // Before the first layout, let the box fill the area rather than collapse.
    if (height <= 0) return { height: '100%' as const };
    return { height: visibleRegionHeight(areaTop.get(), height, coverTop?.get()) };
  });
  return (
    <View
      style={{ flex: 1, width: '100%' }}
      onLayout={(e) => {
        areaTop.set(e.nativeEvent.layout.y);
        areaHeight.set(e.nativeEvent.layout.height);
      }}
    >
      <Animated.View style={[{ position: 'absolute', top: 0, left: 0, right: 0, overflow: 'hidden' }, regionStyle]}>
        {children}
      </Animated.View>
    </View>
  );
}
