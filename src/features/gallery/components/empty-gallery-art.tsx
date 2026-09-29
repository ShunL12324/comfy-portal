import { useEffect, useState } from 'react';
import { AccessibilityInfo, AppState, Platform, View } from 'react-native';
import { useIsFocused } from 'expo-router/react-navigation';
import { SvgXml } from 'react-native-svg';
import Animated, {
  SensorType, useAnimatedSensor, useAnimatedStyle, useFrameCallback,
  useReducedMotion, useSharedValue, type SharedValue,
} from 'react-native-reanimated';
import { useDesign } from '@/components/ui/design-system/primitives';
import { emptyGalleryLayers } from './gallery-illustration';
import { galleryTilt, tiltSmoothing } from './gallery-tilt';

type Tilt = { x: number; y: number; rotation: number };
const STILL: Tilt = { x: 0, y: 0, rotation: 0 };
const DEPTH = [-0.35, 1, -0.55];

function Layer({ xml, index, tilt }: { xml: string; index: number; tilt: SharedValue<Tilt> }) {
  const style = useAnimatedStyle(() => {
    const value = tilt.get();
    const depth = DEPTH[index];
    return { transform: [
      { translateX: value.x * depth }, { translateY: value.y * depth },
      { rotateZ: `${value.rotation * depth}deg` },
    ] };
  });
  return <Animated.View style={[{ position: 'absolute', width: 240, height: 180 }, style]}>
    <SvgXml xml={xml} width={240} height={180} />
  </Animated.View>;
}

function SensorArtwork({ layers }: { layers: string[] }) {
  const { sensor } = useAnimatedSensor(SensorType.GRAVITY, { interval: 32, adjustToInterfaceOrientation: true });
  const neutral = useSharedValue<{ x: number; z: number } | null>(null);
  const tilt = useSharedValue<Tilt>(STILL);
  useFrameCallback(({ timeSincePreviousFrame }) => {
    const gravity = sensor.get();
    // Simulators and unavailable sensors report no gravity: keep the illustration still.
    if (!Number.isFinite(gravity.x + gravity.y + gravity.z) ||
        gravity.x ** 2 + gravity.y ** 2 + gravity.z ** 2 < 1) return;
    let origin = neutral.get();
    if (origin === null) {
      origin = { x: gravity.x, z: gravity.z };
      neutral.set(origin);
    }
    const target = galleryTilt(gravity.x, gravity.z, origin.x, origin.z);
    const current = tilt.get();
    const alpha = tiltSmoothing(timeSincePreviousFrame ?? 16);
    tilt.set({
      x: current.x + (target.x - current.x) * alpha,
      y: current.y + (target.y - current.y) * alpha,
      rotation: current.rotation + (target.rotation - current.rotation) * alpha,
    });
  });
  return <>{layers.map((xml, index) => <Layer key={index} xml={xml} index={index} tilt={tilt} />)}</>;
}

/** Decorative motion only: unmount the sensor when the illustration is not active. */
export function EmptyGalleryArt() {
  const c = useDesign();
  const focused = useIsFocused();
  const initiallyReduced = useReducedMotion();
  const [reduced, setReduced] = useState(initiallyReduced);
  const [active, setActive] = useState(AppState.currentState === 'active');
  useEffect(() => {
    const app = AppState.addEventListener('change', state => setActive(state === 'active'));
    const motion = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => { app.remove(); motion.remove(); };
  }, []);
  const layers = emptyGalleryLayers.map(svg => svg
    .replaceAll('#EDEDEE', c.well).replaceAll('#BDBDBF', c.faint)
    .replaceAll('#F7F7F8', c.paper).replaceAll('#E5E5E7', c.raised).replaceAll('#666669', c.muted));
  const animated = focused && active && !reduced && Platform.OS !== 'web';
  return <View testID="empty-gallery-art" pointerEvents="none" accessibilityElementsHidden
    importantForAccessibility="no-hide-descendants" style={{ width: 240, height: 180 }}>
    {animated ? <SensorArtwork layers={layers} /> : layers.map((xml, index) =>
      <View key={index} style={{ position: 'absolute' }}><SvgXml xml={xml} width={240} height={180} /></View>)}
  </View>;
}
