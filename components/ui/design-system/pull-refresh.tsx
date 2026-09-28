import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react';
import { type FlatListProps, type ScrollViewProps, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { cancelAnimation, Easing, runOnJS, useAnimatedScrollHandler, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useFocusEffect } from 'expo-router';
import { PortraitRefreshArt } from './portrait-refresh-art';
import { nextRefreshArtwork } from './refresh-artwork-cycle';

const THRESHOLD = 60;
const REST = 48;
const RETURN_MS = 300;
const COMPLETION_HOLD_MS = 160;
const CYCLE_MS = 1100;
const RESOLVE_MS = 300;
const MIN_PENDING_MS = 100;
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
type RefreshProps = {
    onRefresh?: () => void | Promise<unknown>;
    refreshing?: boolean;
};
function RefreshSurface({ onRefresh, refreshing = false, children }: RefreshProps & {
    children: (onScroll: ReturnType<typeof useAnimatedScrollHandler>) => ReactElement;
}) {
    const [artworkIndex, setArtworkIndex] = useState(0);
    const chooseArtwork = useCallback(() => setArtworkIndex(nextRefreshArtwork()), []);
    const [focused, setFocused] = useState(true);
    useFocusEffect(useCallback(() => { setFocused(true); return () => setFocused(false); }, []));
    const reduced = useReducedMotion();
    const pull = useSharedValue(0);
    const scrollY = useSharedValue(0);
    const startX = useSharedValue(0);
    const startY = useSharedValue(0);
    const busy = useSharedValue(false);
    const phase = useSharedValue(0);
    const resolved = useSharedValue(0);
    const running = useRef(false);
    const mounted = useRef(true);
    const enabled = useRef(focused);
    const latestRefresh = useRef(onRefresh);
    useEffect(() => { enabled.current = focused; latestRefresh.current = onRefresh; }, [focused, onRefresh]);
    const release = useCallback(async () => {
        if (running.current || !enabled.current)
            return;
        running.current = true;
        const started = Date.now();
        try {
            await latestRefresh.current?.();
        }
        finally {
            // Keep fast responses readable without delaying the request or its data.
            await wait(Math.max(0, (reduced ? 0 : MIN_PENDING_MS) - (Date.now() - started)));
            if (mounted.current && enabled.current) {
                cancelAnimation(phase);
                resolved.set(withTiming(1, { duration: reduced ? 0 : RESOLVE_MS, easing: Easing.inOut(Easing.cubic) }));
                // Hold the final arrangement after it has settled.
                await wait(reduced ? 0 : RESOLVE_MS + COMPLETION_HOLD_MS);
            }
            if (mounted.current && enabled.current) {
                pull.set(withTiming(0, {
                    duration: reduced ? 0 : RETURN_MS,
                    easing: Easing.bezier(0.22, 0.61, 0.36, 1),
                }));
                // Preserve the resolved picture while the refresh surface closes.
                await wait(reduced ? 0 : RETURN_MS);
            }
            running.current = false;
            if (mounted.current) {
                busy.set(false);
                cancelAnimation(phase);
            }
        }
    }, [busy, phase, pull, reduced, resolved]);
    useEffect(() => {
        mounted.current = true;
        return () => { mounted.current = false; cancelAnimation(pull); cancelAnimation(phase); cancelAnimation(resolved); };
    }, [pull, phase, resolved]);
    useEffect(() => {
        if (!focused) {
            cancelAnimation(phase);
            pull.set(0);
            busy.set(false);
            return;
        }
        // A gesture owns its full enter/hold/exit sequence; prop updates must not restart it.
        if (running.current) return;
        cancelAnimation(phase);
        const selectionFrame = refreshing ? requestAnimationFrame(chooseArtwork) : undefined;
        if (refreshing) {
            busy.set(true);
            resolved.set(0);
            phase.set(0);
            pull.set(withTiming(REST, { duration: reduced ? 0 : 200 }));
            if (!reduced)
                phase.set(withRepeat(withTiming(1, { duration: CYCLE_MS, easing: Easing.linear }, (finished) => {
                    if (finished) runOnJS(chooseArtwork)();
                }), -1));
        }
        else if (!running.current) {
            busy.set(false);
            pull.set(withTiming(0, { duration: reduced ? 0 : 220 }));
        }
        return () => { if (selectionFrame !== undefined) cancelAnimationFrame(selectionFrame); };
    }, [focused, refreshing, reduced, pull, busy, phase, resolved, chooseArtwork]);
    const onScroll = useAnimatedScrollHandler({ onScroll: (event) => { scrollY.set(event.contentOffset.y); } });
    const native = Gesture.Native();
    const pan = Gesture.Pan().enabled(focused && !!onRefresh).manualActivation(true)
        .onTouchesDown((event) => { const touch = event.allTouches[0]; if (touch) {
        if (!busy.get()) resolved.set(0);
        startX.set(touch.absoluteX);
        startY.set(touch.absoluteY);
    } })
        .onTouchesMove((event, manager) => {
        const touch = event.allTouches[0];
        if (!touch)
            return;
        const dx = touch.absoluteX - startX.get();
        const dy = touch.absoluteY - startY.get();
        if (busy.get() || scrollY.get() > 0.5 || dy < -6 || Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy))
            manager.fail();
        else if (dy > 8)
            manager.activate();
    })
        .onStart(() => { runOnJS(chooseArtwork)(); })
        .onUpdate((event) => { if (!busy.get())
        pull.set(110 * (1 - Math.exp(-Math.max(0, event.translationY) / 180))); })
        // The gesture callback invokes release only after touch-up, never during render.
        // eslint-disable-next-line react-hooks/refs
        .onEnd(() => {
        if (busy.get())
            return;
        if (pull.get() >= THRESHOLD) {
            busy.set(true);
            resolved.set(0);
            phase.set(0);
            pull.set(withTiming(REST, { duration: reduced ? 0 : 200 }));
            if (!reduced)
                phase.set(withRepeat(withTiming(1, { duration: CYCLE_MS, easing: Easing.linear }, (finished) => {
                    if (finished) runOnJS(chooseArtwork)();
                }), -1));
            runOnJS(release)();
        }
        else
            pull.set(withTiming(0, { duration: reduced ? 0 : 180 }));
    })
        .onFinalize(() => { if (!busy.get())
        pull.set(withTiming(0, { duration: reduced ? 0 : 180 })); });
    const contentStyle = useAnimatedStyle(() => ({ transform: [{ translateY: pull.get() }] }));
    const indicatorStyle = useAnimatedStyle(() => ({
        opacity: Math.min(1, pull.get() / 20),
        transform: [{ translateY: Math.max(0, pull.get() / 2 - 16) }],
    }));
    return <View style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
    <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center' }}>
      <Animated.View testID="refresh-indicator" style={[{ width: 32, height: 32 }, indicatorStyle]}>
        <PortraitRefreshArt phase={phase} resolved={resolved} artworkIndex={artworkIndex}/>
      </Animated.View>
    </View>
    <Animated.View testID="refresh-content" style={[{ flex: 1, minHeight: 0 }, contentStyle]}>
      <GestureDetector gesture={Gesture.Simultaneous(native, pan)}>{children(onScroll)}</GestureDetector>
    </Animated.View>
  </View>;
}
export function RefreshScrollView({ onRefresh, refreshing, ...props }: Omit<ScrollViewProps, 'onScroll' | 'refreshControl'> & RefreshProps) {
    return <RefreshSurface onRefresh={onRefresh} refreshing={refreshing}>{(onScroll) => <Animated.ScrollView {...props} bounces={false} overScrollMode="never" onScroll={onScroll} scrollEventThrottle={16}/>}</RefreshSurface>;
}
export function RefreshFlatList<T>({ onRefresh, refreshing, ...props }: Omit<FlatListProps<T>, 'onScroll' | 'refreshControl' | 'onRefresh' | 'CellRendererComponent'> & RefreshProps) {
    return <RefreshSurface onRefresh={onRefresh} refreshing={refreshing}>{(onScroll) => <Animated.FlatList {...props} bounces={false} overScrollMode="never" onScroll={onScroll} scrollEventThrottle={16}/>}</RefreshSurface>;
}
