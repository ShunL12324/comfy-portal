import { RotatingSpinner } from '@/components/ui/rotating-spinner';
import { Copy, Row, Status, useDesign } from '@/components/ui/design-system/primitives';
import { MotiView } from 'moti';
import { useEffect, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { designTokens as t } from '@/constants/design-tokens';

const ENTER_EASING = Easing.bezier(...t.easing.enter);
const EXIT_EASING = Easing.bezier(...t.easing.exit);

/**
 * Props for the ServerStatus component
 */
interface ServerStatusProps {
  /** Whether the server is currently generating media */
  generating: boolean;
  /** Whether the server is currently downloading media */
  downloading?: boolean;
  /** Download progress percentage (0-100) */
  downloadProgress?: number;
  /** Generation progress information */
  generationProgress?: {
    value: number;
    max: number;
  };
  /** Node execution progress */
  nodeProgress?: {
    completed: number;
    total: number;
  };
  currentNodeId?: string;
  currentNodeName?: string;
}

/**
 * Cross-fades a slot when its `swapKey` changes, so state swaps inside the
 * block (spinner → step count, generating → saving) don't flash.
 */
function Swap({ swapKey, reduced, children }: { swapKey: string; reduced: boolean; children: ReactNode }) {
  return (
    <Animated.View
      key={swapKey}
      entering={reduced ? undefined : FadeIn.duration(t.motion.fast)}
      exiting={reduced ? undefined : FadeOut.duration(t.motion.fast)}
    >
      {children}
    </Animated.View>
  );
}

/**
 * Displays active generation and saving progress in the Run page header.
 * The block grows in (height, fade, small drop) when a run starts and folds
 * away when it ends, so the header and result area below move smoothly.
 */
export function ServerStatus(props: ServerStatusProps) {
  const active = props.generating || !!props.downloading;
  const reduced = useReducedMotion();
  // Keep the last active snapshot so the block folds away showing what it last said.
  const signature = JSON.stringify(props);
  const [snapshot, setSnapshot] = useState({ signature, props });
  if (active && snapshot.signature !== signature) setSnapshot({ signature, props });
  const [mounted, setMounted] = useState(active);
  if (active && !mounted) setMounted(true);

  const presence = useSharedValue(0);
  const contentHeight = useSharedValue(0);
  useEffect(() => {
    presence.set(
      withTiming(
        active ? 1 : 0,
        {
          duration: reduced ? 0 : active ? t.motion.base : t.motion.fast,
          easing: active ? ENTER_EASING : EXIT_EASING,
        },
        (finished) => {
          if (finished && !active) scheduleOnRN(setMounted, false);
        },
      ),
    );
  }, [active, reduced, presence]);

  const containerStyle = useAnimatedStyle(() => ({
    height: contentHeight.get() * presence.get(),
    opacity: presence.get(),
    transform: [{ translateY: (presence.get() - 1) * t.layout.label }],
  }));

  if (!mounted) return null;
  return (
    // The app bar spaces its rows with `t.layout.label`; the block pulls that gap
    // inside itself so it collapses to nothing rather than to a 4pt step.
    <Animated.View style={[{ marginTop: -t.layout.label, overflow: 'hidden' }, containerStyle]}>
      <View
        style={{ position: 'absolute', top: 0, left: 0, right: 0, paddingTop: t.layout.label }}
        onLayout={(e) => {
          const next = e.nativeEvent.layout.height;
          const first = contentHeight.get() === 0;
          contentHeight.set(
            first || reduced ? next : withTiming(next, { duration: t.motion.base, easing: ENTER_EASING }),
          );
        }}
      >
        <StatusContent {...(active ? props : snapshot.props)} reduced={reduced} />
      </View>
    </Animated.View>
  );
}

function StatusContent({
  generating,
  downloading = false,
  downloadProgress = 0,
  generationProgress,
  nodeProgress,
  currentNodeId,
  currentNodeName,
  reduced,
}: ServerStatusProps & { reduced: boolean }) {
  const c = useDesign();
  const ratio = downloading
    ? downloadProgress / 100
    : generationProgress?.max
      ? generationProgress.value / generationProgress.max
      : undefined;
  const percent = ratio === undefined ? undefined : Math.max(0, Math.min(100, ratio * 100));
  const showNodes = generating && !!nodeProgress && nodeProgress.total > 0;
  return (
    <View style={{ gap: t.layout.label }}>
      <Row style={{ justifyContent: 'space-between', gap: t.layout.related }}>
        <Swap swapKey={showNodes ? 'nodes' : downloading ? 'saving' : 'busy'} reduced={reduced}>
          {showNodes ? (
            <Copy muted size="metadata">
              Nodes {nodeProgress!.completed} / {nodeProgress!.total}
            </Copy>
          ) : (
            <Status
              state={downloading ? 'downloading' : 'busy'}
              label={downloading ? 'Saving' : 'Generating'}
              pulse={false}
              size="metadata"
            />
          )}
        </Swap>
      </Row>
      <Row style={{ justifyContent: 'space-between', gap: t.layout.related }}>
        <View style={{ flex: 1 }}>
          <Swap swapKey={downloading ? 'saving' : 'node'} reduced={reduced}>
            <Copy size="label" numberOfLines={1}>
              {downloading
                ? 'Saving outputs'
                : currentNodeName || (currentNodeId ? 'Node ' + currentNodeId : 'Waiting for execution')}
            </Copy>
          </Swap>
        </View>
        <Swap swapKey={percent === undefined ? 'spinner' : downloading ? 'percent' : 'steps'} reduced={reduced}>
          {percent === undefined ? (
            <RotatingSpinner size="sm" color={c.ink} />
          ) : (
            <Copy muted size="metadata">
              {downloading
                ? Math.round(percent) + '%'
                : generationProgress!.value + ' / ' + generationProgress!.max + ' steps'}
            </Copy>
          )}
        </Swap>
      </Row>
      {percent !== undefined && (
        <Animated.View
          entering={reduced ? undefined : FadeIn.duration(t.motion.fast)}
          accessibilityRole="progressbar"
          accessibilityLabel={downloading ? 'Saving output files' : 'Current node steps'}
          accessibilityValue={{ min: 0, max: 100, now: Math.round(percent) }}
          style={{ width: '100%', height: 3, backgroundColor: c.line, overflow: 'hidden' }}
        >
          <MotiView
            key={downloading ? 'saving' : (currentNodeId ?? 'steps')}
            animate={{ width: `${percent}%` }}
            transition={{ type: 'timing', duration: reduced ? 0 : t.motion.progress }}
            style={{ height: 3, backgroundColor: c.ink }}
          />
        </Animated.View>
      )}
    </View>
  );
}
