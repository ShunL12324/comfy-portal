import Svg, { Path } from 'react-native-svg';
import Animated, { useAnimatedProps, type SharedValue } from 'react-native-reanimated';
import { REFRESH_ARTWORKS, type ArtworkDotGroup } from '../../../../assets/illustrations/refresh-artworks';
import { useDesign } from './primitives';

const AnimatedPath = Animated.createAnimatedComponent(Path);
type Motion = { phase: SharedValue<number>; resolved: SharedValue<number> };
function DotGroup({ group, phase, resolved, color, dark }: Motion & {
  group: ArtworkDotGroup; color: string; dark: boolean;
}) {
  const props = useAnimatedProps(() => {
    // Complete each portrait while the request is pending, not only after it resolves.
    const progress = Math.min(1, Math.max(0, (phase.get() - 0.06) / 0.76));
    const reveal = progress * progress * (3 - 2 * progress);
    const clarity = Math.max(resolved.get(), reveal);
    const noise = 0.18 + 0.38 * (0.5 + 0.5 * Math.sin(phase.get() * Math.PI * 4 + group.noise * 1.8));
    const target = dark ? group.tone : 1 - group.tone;
    const dx = Math.sin(group.noise * 1.7 + phase.get() * Math.PI * 2) * (1 - clarity);
    const dy = Math.cos(group.noise * 1.7 + phase.get() * Math.PI * 2) * (1 - clarity);
    const d = group.points.map(([x, y]) =>
      `M ${x + dx - 0.43} ${y + dy} a .43 .43 0 1 0 .86 0 a .43 .43 0 1 0 -.86 0`
    ).join(' ');
    return {
      d,
      opacity: noise + (target - noise) * clarity,
    };
  });
  return <AnimatedPath testID="refresh-portrait-dots" fill={color} animatedProps={props}/>;
}
export function PortraitRefreshArt({ phase, resolved, artworkIndex }: Motion & { artworkIndex: number }) {
  const c = useDesign();
  const dark = parseInt(c.paper.slice(1, 3), 16) < 128;
  const artwork = REFRESH_ARTWORKS[artworkIndex];
  return <Svg accessibilityLabel={artwork.id} testID="refresh-portrait" width={32} height={32} viewBox="0 0 32 32">
    {artwork.groups.map((group, index) =>
      <DotGroup key={index} group={group} phase={phase} resolved={resolved} color={c.ink} dark={dark}/>
    )}
  </Svg>;
}
