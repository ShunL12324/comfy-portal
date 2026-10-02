import React, { createContext, useContext, useEffect, useState } from 'react';
import { type StyleProp, type ViewStyle } from 'react-native';
import { MotiView } from 'moti';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  useReducedMotion,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { Check, Minus, Plus, Search, type LucideIcon } from '@/constants/icons';
import { View as Box } from '@/components/ui/view';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { Button, ButtonText, ButtonSpinner } from '@/components/ui/button';
import { Input, InputField, InputSlot } from '@/components/ui/input';
import { Textarea, TextareaInput } from '@/components/ui/textarea';
import { Radio, RadioGroup, RadioLabel } from '@/components/ui/radio';
import { Checkbox, CheckboxIndicator, CheckboxIcon, CheckboxLabel } from '@/components/ui/checkbox';
import { Progress, ProgressFilledTrack } from '@/components/ui/progress';
import {
  designColors,
  designTokens as t,
  iconStroke,
  type DesignMode,
  type IconSize,
  type TypeSize,
} from '@/constants/design-tokens';
import { useResolvedTheme } from '@/store/theme';
import { usePressFeedback } from './press-feedback';
import { useCompactControls } from './control-density';
import { actionIconGeometry } from './action-geometry';

const Context = createContext<(typeof designColors)[DesignMode] | null>(null);
export const DesignColorProvider = Context.Provider;
export function useDesign() {
  const provided = useContext(Context);
  const mode = useResolvedTheme();
  return provided ?? designColors[mode];
}
const AppBarActionContext = createContext(false);
export const AppBarActionProvider = AppBarActionContext.Provider;
export function DesignScope({ mode, children }: React.PropsWithChildren<{ mode: DesignMode }>) {
  const c = designColors[mode];
  return (
    <Context.Provider value={c}>
      <Box style={{ flex: 1, backgroundColor: c.paper }}>{children}</Box>
    </Context.Provider>
  );
}
/** Quiet feedback glyphs share size and proportional stroke across nodes and sheets. */
export function StateIcon({
  icon: Glyph,
  size = t.icon.large,
  color,
}: {
  icon: LucideIcon;
  size?: IconSize;
  color?: string;
}) {
  const c = useDesign();
  return <Glyph width={size} height={size} strokeWidth={iconStroke(size)} color={color ?? c.muted} />;
}
export function Copy({
  children,
  mono = false,
  muted = false,
  size,
  style,
  ...props
}: Omit<React.ComponentProps<typeof Text>, 'size'> & { mono?: boolean; muted?: boolean; size?: TypeSize }) {
  const c = useDesign();
  const compact = useCompactControls();
  const resolvedSize = size ?? (compact ? 'label' : 'body');
  return (
    <Text
      {...props}
      style={[
        {
          color: muted ? c.muted : c.ink,
          fontSize: t.type[resolvedSize],
          lineHeight: t.leading[resolvedSize],
          ...(resolvedSize === 'section' ? { fontWeight: '500' as const } : {}),
        },
        style,
        mono ? { fontVariant: ['tabular-nums'] } : undefined,
      ]}
    >
      {children}
    </Text>
  );
}
export function Title({
  children,
  compact = false,
  style,
  ...props
}: React.ComponentProps<typeof Heading> & { compact?: boolean }) {
  const c = useDesign();
  return (
    <Heading
      {...props}
      style={[
        {
          fontFamily: t.font.titleSemibold,
          fontWeight: '400',
          fontSize: compact ? t.type.heading : t.type.title,
          lineHeight: compact ? t.leading.heading : t.leading.title,
          color: c.ink,
        },
        style,
      ]}
    >
      {children}
    </Heading>
  );
}
export function Row({ children, style }: React.PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  return (
    <Box
      className="flex-row items-center"
      style={[{ gap: t.layout.field, flexDirection: 'row', alignItems: 'center' }, style]}
    >
      {children}
    </Box>
  );
}
/** Equal-width sheet actions, with each button retaining its full touch target. */
export function ActionRow({ children }: React.PropsWithChildren) {
  return (
    <Row style={{ gap: t.layout.related, width: '100%' }}>
      {React.Children.map(children, (child) => child && <Box style={{ flex: 1, minWidth: 0 }}>{child}</Box>)}
    </Row>
  );
}
export function Panel({
  children,
  style,
  filled = false,
}: React.PropsWithChildren<{ style?: StyleProp<ViewStyle>; filled?: boolean }>) {
  const c = useDesign();
  return (
    <Box
      style={[
        {
          backgroundColor: filled ? c.card : undefined,
          borderWidth: 1,
          borderColor: c.line,
          borderRadius: t.radius.panel,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {children}
    </Box>
  );
}
function RotatingActionIcon({
  icon: Icon,
  size,
  color,
  loading,
}: {
  icon: LucideIcon;
  size: IconSize;
  color: string;
  loading: boolean;
}) {
  const rotation = useSharedValue(0);
  const reduced = useReducedMotion();
  useEffect(() => {
    cancelAnimation(rotation);
    if (reduced) {
      rotation.set(0);
    } else if (loading) {
      // A quick retry continues from a pending return rather than resetting.
      const target = rotation.get() + 360;
      rotation.set(withRepeat(withTiming(target, { duration: t.motion.spin, easing: Easing.linear }), -1, false));
    } else {
      // Finish forwards at the same resting orientation, never snap or reverse.
      const angle = rotation.get();
      const target = Math.ceil(angle / 360) * 360;
      rotation.set(
        withTiming(target, {
          duration: Math.min(t.motion.base, ((target - angle) / 360) * t.motion.spin),
          easing: Easing.out(Easing.quad),
        }),
      );
    }
    return () => cancelAnimation(rotation);
  }, [loading, reduced, rotation]);
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotation.get()}deg` }] }));
  return (
    <Animated.View testID="button-rotating-icon" style={[{ width: size, height: size }, style]}>
      <Icon strokeWidth={iconStroke(size)} width={size} height={size} color={color} />
    </Animated.View>
  );
}

export function Action({
  children,
  kind: providedKind,
  destructive = false,
  icon,
  disabled = false,
  loading = false,
  loadingAnimation = 'ring',
  onPress,
  label,
  small = false,
  fill = false,
  iconSize: providedIconSize,
}: React.PropsWithChildren<{
  kind?: 'primary' | 'secondary' | 'text' | 'tonal';
  destructive?: boolean;
  icon?: LucideIcon;
  disabled?: boolean;
  loading?: boolean;
  loadingAnimation?: 'ring' | 'rotate-icon';
  onPress?: () => void;
  label?: string;
  small?: boolean;
  fill?: boolean;
  iconSize?: IconSize;
}>) {
  const c = useDesign();
  const inAppBar = useContext(AppBarActionContext);
  const iconOnly = !children;
  const kind = providedKind ?? (inAppBar ? 'text' : 'secondary');
  const { iconSize, slot, spinner, gap } = actionIconGeometry({ iconOnly, inAppBar, iconSize: providedIconSize });
  const surfaceHeight = small && !iconOnly ? t.height.small : t.height.control;
  const surfaceInset = (t.height.touch - surfaceHeight) / 2;
  const solid = kind === 'primary';
  const solidColor = destructive ? c.dangerSolid : c.tint;
  const onSolidColor = destructive ? c.onDanger : c.onTint;
  const foreground = solid ? onSolidColor : destructive ? c.danger : kind === 'text' && !iconOnly ? c.tint : c.ink;
  const ActionIcon = icon;
  const flushInAppBar = inAppBar && kind === 'text';
  const press = usePressFeedback();
  const reduced = useReducedMotion();
  return (
    <Button
      accessibilityLabel={label}
      aria-label={label}
      aria-busy={loading}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      isDisabled={disabled || loading}
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      variant="solid"
      action="default"
      className=""
      style={{
        minHeight: t.height.touch,
        minWidth: t.height.touch,
        flexShrink: 0,
        height: t.height.touch,
        paddingHorizontal: 0,
        // Only a bare text action hugs the app bar's gutter; a bordered or filled one keeps its padding.
        paddingLeft: iconOnly || flushInAppBar ? 0 : small ? t.layout.related : t.layout.rowY,
        paddingRight: iconOnly || flushInAppBar ? 0 : small ? t.layout.related : t.layout.rowY,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: inAppBar && kind === 'text' ? 'flex-end' : 'center',
        columnGap: 0,
        rowGap: 0,
        width: fill ? '100%' : iconOnly ? t.height.touch : undefined,
        borderRadius: t.radius.control,
        borderWidth: 0,
        borderColor: 'transparent',
        backgroundColor: 'transparent',
        gap: 0,
        opacity: disabled ? t.opacity.disabled : 1,
      }}
    >
      <MotiView
        testID="button-surface"
        pointerEvents="none"
        animate={press.animate}
        transition={press.transition}
        style={{
          // Paint fill and border together; color interpolation can hide a label mid-selection.
          backgroundColor: solid ? solidColor : kind === 'tonal' ? c.well : 'transparent',
          borderColor: solid ? solidColor : kind === 'tonal' ? c.well : kind === 'secondary' ? c.boundary : 'transparent',
          position: 'absolute',
          top: surfaceInset,
          bottom: surfaceInset,
          left: iconOnly ? 4 : 0,
          right: iconOnly ? 4 : 0,
          borderRadius: t.radius.control,
          borderWidth: 1,
        }}
      />
      <Box
        pointerEvents="none"
        style={{
          position: 'relative',
          zIndex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          columnGap: 0,
          rowGap: 0,
        }}
      >
        <MotiView
          testID="button-icon-slot"
          animate={{
            width: icon || loading ? slot : 0,
            marginRight: icon || loading ? gap : 0,
          }}
          transition={{ type: 'timing', duration: reduced ? 0 : 180 }}
          style={{
            height: slot,
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            overflow: 'hidden',
          }}
        >
          {loadingAnimation === 'rotate-icon' && ActionIcon ? (
            <RotatingActionIcon icon={ActionIcon} size={iconSize} color={foreground} loading={loading} />
          ) : (
            <>
              <ButtonSpinner
                aria-hidden
                accessibilityElementsHidden
                animating={loading}
                color={foreground}
                size={spinner}
                style={{ position: 'absolute', top: (slot - spinner) / 2, left: (slot - spinner) / 2 }}
              />
              {!loading && ActionIcon ? (
                <ActionIcon
                  strokeWidth={iconStroke(iconSize)}
                  width={iconSize}
                  height={iconSize}
                  color={foreground}
                  style={{ width: iconSize, height: iconSize, margin: 0, padding: 0 }}
                />
              ) : null}
            </>
          )}
        </MotiView>
        {children ? (
          <MotiView
            key={typeof children === 'string' ? children : 'label'}
            animate={{ opacity: 1 }}
            transition={{ type: 'timing', duration: reduced ? 0 : 160 }}
          >
            <ButtonText
              testID="button-label"
              style={{
                fontSize: t.type.body,
                lineHeight: t.leading.body,
                fontFamily: t.font.medium,
                fontWeight: '400',
                color: foreground,
                margin: 0,
                padding: 0,
              }}
            >
              {children}
            </ButtonText>
          </MotiView>
        ) : null}
      </Box>
    </Button>
  );
}
/** The one field label: readable secondary ink, weighted above muted helper copy. */
export function FieldLabel({ children }: React.PropsWithChildren) {
  const c = useDesign();
  return (
    <Copy size="label" style={{ color: c.secondary, fontWeight: '500' }}>
      {children}
    </Copy>
  );
}
export function Field({
  label,
  value,
  onChange,
  placeholder,
  mono = false,
  disabled = false,
  error,
  search = false,
  multiline = false,
  surface = 'inset',
}: {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  mono?: boolean;
  disabled?: boolean;
  error?: string;
  search?: boolean;
  multiline?: boolean;
  surface?: 'inset' | 'workspace-card';
}) {
  const c = useDesign();
  const [focused, setFocused] = useState(false);
  const fieldBackground = surface === 'workspace-card' ? c.workspaceCard : c.well;
  const inner = {
    fontSize: t.type.body,
    lineHeight: t.leading.body,
    color: c.ink,
    fontFamily: t.font.sans,
    fontVariant: mono ? ['tabular-nums' as const] : undefined,
    paddingHorizontal: t.layout.field,
  };
  return (
    <Box style={{ gap: t.layout.label }}>
      {!search && <FieldLabel>{label}</FieldLabel>}
      {multiline ? (
        <Textarea
          isDisabled={disabled}
          isInvalid={!!error}
          style={{
            backgroundColor: fieldBackground,
            borderRadius: t.radius.control,
            borderWidth: 1,
            borderColor: error ? c.danger : focused ? c.tint : 'transparent',
            minHeight: 88,
          }}
        >
          <TextareaInput
            accessibilityLabel={label}
            aria-label={label}
            value={value}
            onChangeText={onChange}
            placeholder={placeholder}
            placeholderTextColor={c.muted}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            style={[inner, { lineHeight: t.leading.body, paddingVertical: t.layout.rowY, textAlignVertical: 'top' }]}
          />
        </Textarea>
      ) : (
        <Input
          isDisabled={disabled}
          isInvalid={!!error}
          style={{
            backgroundColor: fieldBackground,
            borderRadius: t.radius.control,
            minHeight: t.height.touch,
            height: t.height.touch,
            borderWidth: 1,
            borderColor: error ? c.danger : focused ? c.tint : 'transparent',
          }}
        >
          {search ? (
            <InputSlot
              style={{
                paddingLeft: t.layout.field,
                height: t.height.touch - 2,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Search color={c.muted} size={t.icon.control} strokeWidth={iconStroke(t.icon.control)} />
            </InputSlot>
          ) : null}
          <InputField
            accessibilityLabel={label}
            aria-label={label}
            value={value}
            onChangeText={onChange}
            placeholder={placeholder ?? (search ? label : undefined)}
            placeholderTextColor={c.muted}
            autoCapitalize={search ? 'none' : undefined}
            autoCorrect={search ? false : undefined}
            clearButtonMode={search ? 'while-editing' : undefined}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            style={[
              inner,
              { paddingVertical: 0, textAlignVertical: 'center', includeFontPadding: false },
              search && { height: t.height.touch - 2, lineHeight: undefined, paddingLeft: t.layout.related },
            ]}
          />
        </Input>
      )}
      {error ? (
        <Copy accessibilityRole="alert" size="label" style={{ color: c.danger }}>
          {error}
        </Copy>
      ) : null}
    </Box>
  );
}
export function Segments({
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
  const c = useDesign();
  const reduced = useReducedMotion();
  const [width, setWidth] = useState(0);
  const index = Math.max(0, options.indexOf(value));
  const cell = (width - 4) / Math.max(1, options.length);
  return (
    <RadioGroup
      accessibilityLabel={label}
      aria-label={label}
      value={value}
      onChange={onChange}
      isDisabled={disabled}
      style={{ minHeight: t.height.touch }}
    >
      <Box
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        style={{
          flexDirection: 'row',
          minHeight: t.height.touch,
          paddingHorizontal: t.layout.badgeY,
        }}
      >
        <Box
          pointerEvents="none"
          testID="segment-track"
          style={{
            position: 'absolute',
            top: (t.height.touch - t.height.control) / 2,
            left: 0,
            right: 0,
            height: t.height.control,
            backgroundColor: c.well,
            borderRadius: t.radius.choice,
          }}
        />
        {width > 4 ? (
          <MotiView
            pointerEvents="none"
            animate={{ translateX: index * cell }}
            transition={{ type: 'timing', duration: reduced ? 0 : t.motion.fast }}
            style={{
              position: 'absolute',
              top: (t.height.touch - t.height.control) / 2 + t.layout.badgeY,
              bottom: (t.height.touch - t.height.control) / 2 + t.layout.badgeY,
              left: 2,
              width: cell,
              borderRadius: t.radius.choiceThumb,
              backgroundColor: c.tintSurface,
            }}
          />
        ) : null}
        {options.map((o) => (
          <Radio
            key={o}
            value={o}
            accessibilityLabel={o}
            style={{ flex: 1, justifyContent: 'center', minHeight: t.height.touch, paddingHorizontal: t.layout.label }}
          >
            <RadioLabel
              numberOfLines={1}
              style={{
                fontSize: t.type.label,
                lineHeight: t.leading.label,
                color: o === value ? c.tint : c.secondary,
                fontWeight: '500',
                textAlign: 'center',
              }}
            >
              {o}
            </RadioLabel>
          </Radio>
        ))}
      </Box>
    </RadioGroup>
  );
}
export function CheckControl({
  value,
  onChange,
  label,
  disabled = false,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  const c = useDesign();
  return (
    <Checkbox
      size="sm"
      value={label}
      isChecked={value}
      onChange={onChange}
      isDisabled={disabled}
      style={{ minHeight: t.height.touch, gap: t.layout.related }}
    >
      <CheckboxIndicator
        style={{
          borderRadius: t.radius.small,
          borderColor: value ? c.tint : c.muted,
          backgroundColor: value ? c.tint : 'transparent',
        }}
      >
        <CheckboxIcon as={Check} color={c.onTint} />
      </CheckboxIndicator>
      <CheckboxLabel style={{ fontSize: t.type.body, color: c.ink }}>{label}</CheckboxLabel>
    </Checkbox>
  );
}
export function Stepper({
  value,
  min = 0,
  max = 100,
  step = 1,
  onChange,
  label,
}: {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (v: number) => void;
  label: string;
}) {
  const c = useDesign();
  return (
    <Panel>
      <Row style={{ gap: 0 }}>
        <Box style={{ flex: 1, minWidth: t.height.touch }}>
          <Action
            fill
            icon={Minus}
            kind="text"
            label={'Decrease ' + label}
            disabled={value <= min}
            onPress={() => onChange(Math.max(min, Number((value - step).toFixed(4))))}
          />
        </Box>
        <Copy
          mono
          size="label"
          style={{
            flex: 2,
            minWidth: t.height.touch,
            textAlign: 'center',
            borderLeftWidth: 1,
            borderRightWidth: 1,
            borderColor: c.subtle,
          }}
        >
          {value}
        </Copy>
        <Box style={{ flex: 1, minWidth: t.height.touch }}>
          <Action
            fill
            icon={Plus}
            kind="text"
            label={'Increase ' + label}
            disabled={value >= max}
            onPress={() => onChange(Math.min(max, Number((value + step).toFixed(4))))}
          />
        </Box>
      </Row>
    </Panel>
  );
}
export type StatusState = 'ready' | 'busy' | 'downloading' | 'offline' | 'error';
/**
 * Solid fill for a live state, a hollow ring for offline. This is the one
 * place colour is allowed to carry meaning, and it never carries it alone —
 * the word beside the dot says the same thing.
 */
const STATUS_DOT: Record<StatusState, string> = {
  ready: 'bg-status-online',
  busy: 'bg-status-busy',
  downloading: 'bg-status-downloading',
  offline: 'border border-ink/40',
  error: 'bg-status-danger',
};
export function Status({
  state = 'ready',
  label,
  pulse = state === 'busy',
  size = 'label',
  numberOfLines,
  style,
}: {
  state?: StatusState;
  label: string;
  /** The slow breath. Defaults to busy, but a state can be shown at rest. */
  pulse?: boolean;
  size?: TypeSize;
  numberOfLines?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const reduced = useReducedMotion();
  const breathing = pulse && !reduced;
  return (
    <Row style={[{ gap: t.layout.status }, style]}>
      <MotiView
        from={{ opacity: 1 }}
        animate={{ opacity: breathing ? t.opacity.disabled : 1 }}
        transition={{
          type: 'timing',
          duration: t.motion.breathe / 2,
          easing: Easing.inOut(Easing.quad),
          loop: breathing,
        }}
      >
        {/* The class goes on a plain View, not on the animated wrapper: NativeWind
            only has interop for components it knows, and on web the wrapper drops
            the class silently — which rendered every status dot invisible. */}
        <Box className={`rounded-full ${STATUS_DOT[state]}`} style={{ width: 7, height: 7 }} />
      </MotiView>
      <Copy size={size} muted numberOfLines={numberOfLines} style={{ flexShrink: 1, minWidth: 0 }}>
        {label}
      </Copy>
    </Row>
  );
}
export function Meter({ value, label = 'Progress' }: { value: number; label?: string }) {
  const c = useDesign();
  return (
    <Progress
      accessibilityLabel={label}
      aria-label={label}
      value={Math.max(0, Math.min(100, value))}
      style={{ height: 2, backgroundColor: c.line, borderRadius: t.radius.pill }}
    >
      <ProgressFilledTrack style={{ backgroundColor: c.ink }} />
    </Progress>
  );
}
