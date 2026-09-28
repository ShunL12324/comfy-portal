import Svg, { G, Path, Rect } from 'react-native-svg';
import Animated, { useAnimatedProps, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedRect = Animated.createAnimatedComponent(Rect);
type Props = {
  phase: SharedValue<number>;
  resolved: SharedValue<number>;
  progress: SharedValue<number>;
  color: string;
};

function smooth(value: number, start: number, end: number) {
  'worklet';
  const t = Math.max(0, Math.min(1, (value - start) / (end - start)));
  return t * t * (3 - 2 * t);
}

// Four cubic segments preserve the same path topology throughout the entire animation.
function oval(cx: number, cy: number, rx: number, ry: number) {
  'worklet';
  const k = 0.55228475;
  return [
    cx - rx, cy,
    cx - rx, cy - ry * k, cx - rx * k, cy - ry, cx, cy - ry,
    cx + rx * k, cy - ry, cx + rx, cy - ry * k, cx + rx, cy,
    cx + rx, cy + ry * k, cx + rx * k, cy + ry, cx, cy + ry,
    cx - rx * k, cy + ry, cx - rx, cy + ry * k, cx - rx, cy,
  ];
}
const FAR = [0, 18, 5, 8, 10, 8, 15, 14, 19, 18, 23, 18, 26, 19, 26, 24, 26, 24, 20, 24, 10, 24, 0, 24, 0, 18];
const NEAR = [0, 22, 6, 19, 8, 14, 14, 14, 20, 14, 23, 19, 26, 20, 26, 24, 26, 24, 20, 24, 10, 24, 0, 24, 0, 22];

function ImageMaterial({ index, progress, phase, resolved, color }: Props & { index: number }) {
  const props = useAnimatedProps(() => {
    const stage = resolved.get();
    const gather = smooth(stage, 0, 0.65);
    const form = smooth(stage, 0.55, 1);
    const spread = Math.min(1, progress.get() / 48);
    const wave = phase.get() * Math.PI * 2 + index;
    const side = index === 1 ? 1 : -1;
    const originX = 13 + side * (index === 2 ? 17 : 20) * spread;
    const originY = index === 2 ? 5 : index === 0 ? 12 : 16;
    const centerX = originX + (13 - originX) * gather;
    const centerY = originY + (index === 2 ? 4 : 0) * gather + Math.sin(wave) * 0.8 * (1 - stage);
    const source = oval(centerX, centerY, index === 2 ? 4 : 7, index === 2 ? 3.5 : 5.5);
    const target = index === 0 ? FAR : index === 1 ? NEAR : oval(18, 5, 2, 2);
    const points = source.map((coordinate, i) => coordinate + (target[i] - coordinate) * form);
    let d = `M ${points[0]} ${points[1]}`;
    for (let i = 2; i < points.length; i += 6) {
      d += ` C ${points.slice(i, i + 6).join(' ')}`;
    }
    return {
      d: d + ' Z',
      // Use one ink density during contact so intersecting shapes have no dark seam.
      // Artwork ink density is part of the morph, not an interactive opacity state.
      opacity: index === 0
        // eslint-disable-next-line tokens/no-literal-style-values
        ? 0.7 + 0.3 * smooth(stage, 0.12, 0.3) - (1 - 0.3 / 0.72) * smooth(stage, 0.68, 1)
        : 1,
    };
  });
  return <AnimatedPath testID={`refresh-material-${index}`} animatedProps={props}
    fill={color}/>;
}

function FusionNeck({ phase, resolved, progress, color }: Props) {
  const props = useAnimatedProps(() => {
    const stage = resolved.get();
    const gather = smooth(stage, 0, 0.65);
    const spread = Math.min(1, progress.get() / 48);
    const left = 13 - 20 * spread * (1 - gather);
    const right = 13 + 20 * spread * (1 - gather);
    const time = phase.get() * Math.PI * 2;
    const y1 = 12 + Math.sin(time) * 0.8 * (1 - stage);
    const y2 = 16 + Math.sin(time + 1) * 0.8 * (1 - stage);
    const thickness = 0.3 + smooth(stage, 0.24, 0.5) * 5;
    // Concave shoulders grow a fluid neck between the actual moving material regions.
    const d = `M ${left} ${y1 - 3}
      C ${left + 6} ${y1 - 3}, 10 ${14 - thickness}, 13 ${14 - thickness}
      C 16 ${14 - thickness}, ${right - 6} ${y2 - 3}, ${right} ${y2 - 3}
      L ${right} ${y2 + 3}
      C ${right - 6} ${y2 + 3}, 16 ${14 + thickness}, 13 ${14 + thickness}
      C 10 ${14 + thickness}, ${left + 6} ${y1 + 3}, ${left} ${y1 + 3} Z`;
    return {
      d,
      opacity: smooth(stage, 0.2, 0.32) * (1 - smooth(stage, 0.55, 0.8)),
    };
  });
  return <AnimatedPath testID="refresh-fusion-neck" animatedProps={props} fill={color}/>;
}

export function LiquidRefreshArt({ progress, phase, resolved, color }: Props) {
  const style = useAnimatedStyle(() => ({ opacity: Math.min(1, progress.get() / 48) }));
  const paper = useAnimatedProps(() => ({ opacity: smooth(resolved.get(), 0.5, 1) * 0.04 }));
  return <Animated.View testID="refresh-liquid" style={[{
    position: 'absolute', left: -13, top: 4, width: 58, height: 24,
  }, style]}>
    <Svg width={58} height={24} viewBox="-16 0 58 24">
      <AnimatedRect width={26} height={24} rx={3} fill={color} animatedProps={paper}/>
      <G opacity={0.72}>
      <FusionNeck progress={progress} phase={phase} resolved={resolved} color={color}/>
      {[0, 1, 2].map((index) => <ImageMaterial key={index} index={index}
        progress={progress} phase={phase} resolved={resolved} color={color}/>)}
      </G>
    </Svg>
  </Animated.View>;
}
