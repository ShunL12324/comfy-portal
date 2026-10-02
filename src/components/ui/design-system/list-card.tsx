import React, { useId, type ReactNode } from 'react';
import { Platform, StyleSheet, type ViewStyle } from 'react-native';
import { NativeText as Text } from '@/components/ui/text/native-text';
import { MotiView } from 'moti';
import * as Haptics from 'expo-haptics';
import { type LucideIcon } from '@/constants/icons';
import { designTokens as t, iconStroke } from '@/constants/design-tokens';
import { Pressable } from '@/components/ui/pressable';
import { View } from '@/components/ui/view';
import { Copy, useDesign } from './primitives';
import { usePressFeedback } from './press-feedback';
import { spoken } from '@/utils/spoken';

/**
 * One quiet surface: name and description, then a compact summary separated by
 * space. Shared by environments, connections and installation states. No internal
 * rules or decorative icon tiles compete with the content. Summaries may wrap
 * deliberately; individual long values truncate with their full accessible hint.
 *
 * Layering: the press target fills the card underneath the content, and the
 * content lets every touch through except at the action. The trailing slot
 * therefore comes in two kinds: a badge is decoration, so taps on it open the
 * card and it is hidden from assistive tech (say it in the hint instead); an
 * action is interactive, a sibling of the card button rather than nested in
 * it, so a screen reader meets two focuses in order: the card ("Open …", with
 * the subtitle and facts as its hint), then the action. The other text is
 * hidden too, because the card's label and hint already say it.
 *
 * The outer surface owns radius, background and the press fade, so the whole
 * card dims like a button does; a border can be added there later without
 * touching the layers.
 */
export function ListCard({
  title,
  subtitle,
  subtitleMono = false,
  badge,
  action,
  facts,
  meta,
  metaMaxWidth,
  metaWidth,
  wrapFacts = true,
  distributeFacts = false,
  factsAlignment = 'flex-start',
  onPress,
  onLongPress,
  longPressLabel,
  accessibilityLabel,
  accessibilityHint,
  testID,
}: {
  title: string;
  /** Numeric addresses stay on one line; descriptions may wrap to two lines. */
  subtitle?: string;
  subtitleMono?: boolean;
  /** Trailing decoration of the identity band, such as an origin word; taps pass through to the card. */
  badge?: ReactNode;
  /** Trailing action of the identity band; the only part of the card with its own touch target. */
  action?: ReactNode;
  /** Leading group of the facts band: a Status or Facts. */
  facts?: ReactNode;
  /** Trailing fact of the facts band; wraps under the leading group when it does not fit. */
  meta?: ReactNode;
  /** Cap long trailing readouts while reserving room for the leading facts. */
  metaMaxWidth?: ViewStyle['maxWidth'];
  metaWidth?: ViewStyle['width'];
  /** Allow wrapping for prose; compact icon/count rows can stay on one line. */
  wrapFacts?: boolean;
  /** Spread a counts-only facts band across the available card width. */
  distributeFacts?: boolean;
  /** Server status stays against the bottom edge beside taller hardware details. */
  factsAlignment?: ViewStyle['alignItems'];
  onPress: () => void;
  /** Secondary entry point, such as the connection sheet. No visible control; a light haptic marks it. */
  onLongPress?: () => void;
  /** Names the long-press destination for assistive tech, e.g. `Connection settings`. */
  longPressLabel?: string;
  accessibilityLabel: string;
  /** Facts worth speaking; the subtitle is prepended automatically. */
  accessibilityHint?: string;
  testID?: string;
}) {
  const c = useDesign();
  const press = usePressFeedback();
  const hintId = useId();
  const longPress = onLongPress
    ? () => {
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        onLongPress();
      }
    : undefined;
  const longPressName = onLongPress && longPressLabel ? longPressLabel : undefined;
  const hint = spoken(subtitle, accessibilityHint, longPressName && `Long press for ${longPressName.toLowerCase()}`);
  const silent = { accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' as const };
  return (
    <MotiView
      animate={press.animate}
      transition={press.transition}
      style={{ borderRadius: t.radius.panel, backgroundColor: c.card }}
    >
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={hint}
        aria-describedby={Platform.OS === 'web' && hint ? hintId : undefined}
        onPress={onPress}
        onLongPress={longPress}
        accessibilityActions={longPressName ? [{ name: 'longpress', label: longPressName }] : undefined}
        onAccessibilityAction={
          longPressName
            ? (event) => {
                if (event.nativeEvent.actionName === 'longpress') onLongPress?.();
              }
            : undefined
        }
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
        style={[StyleSheet.absoluteFill, { borderRadius: t.radius.panel }]}
      />
      {Platform.OS === 'web' && hint ? (
        <Text nativeID={hintId} style={{ display: 'none' }}>
          {hint}
        </Text>
      ) : null}
      <View pointerEvents="box-none" style={{ padding: t.layout.inset, gap: t.card.summaryGap }}>
        {/* box-none here too: on web a box-none parent re-enables its direct children, so the band itself must pass touches through. */}
        <View
          pointerEvents="box-none"
          style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: t.layout.field,
          }}
        >
          <View pointerEvents="none" {...silent} style={{ flex: 1, minWidth: 0, gap: t.layout.label }}>
            <Copy size="section" numberOfLines={1} ellipsizeMode="tail" style={t.card.title}>
              {title}
            </Copy>
            {subtitle ? (
              <Copy mono={subtitleMono} muted size="label" numberOfLines={1} ellipsizeMode="tail">
                {subtitle}
              </Copy>
            ) : null}
          </View>
          {badge ? (
            <View pointerEvents="none" {...silent} style={{ flexShrink: 0 }}>
              {badge}
            </View>
          ) : null}
          {action ? <View style={{ flexShrink: 0 }}>{action}</View> : null}
        </View>
        {facts || meta ? (
          <View
            pointerEvents="none"
            {...silent}
            testID={testID ? `${testID}-facts` : undefined}
            style={{
              flexDirection: 'row',
              flexWrap: wrapFacts ? 'wrap' : 'nowrap',
              alignItems: factsAlignment,
              justifyContent: 'space-between',
              columnGap: t.layout.field,
              rowGap: t.layout.label,
            }}
          >
            {facts ? (
              <View
                pointerEvents="none"
                {...silent}
                style={{
                  flexShrink: 1,
                  flexGrow: distributeFacts ? 1 : 0,
                  minWidth: 0,
                  flexDirection: 'row',
                  flexWrap: wrapFacts ? 'wrap' : 'nowrap',
                  alignItems: 'center',
                  justifyContent: distributeFacts ? 'space-between' : undefined,
                  columnGap: t.layout.field,
                  rowGap: t.layout.label,
                }}
              >
                {facts}
              </View>
            ) : null}
            {meta ? (
              <View
                pointerEvents="none"
                style={{ flexShrink: 0, minWidth: 0, maxWidth: metaMaxWidth, width: metaWidth }}
              >
                {meta}
              </View>
            ) : null}
          </View>
        ) : null}
      </View>
    </MotiView>
  );
}

/** A glyph, a numeric readout and its unit word: `▣ 12 models`. Reads as one element. */
export function Fact({
  icon: Icon,
  value,
  label,
  mono = true,
  testID,
}: {
  icon?: LucideIcon;
  value: string;
  label?: string;
  /** Off for prose values such as `Size unavailable`. */
  mono?: boolean;
  testID?: string;
}) {
  const c = useDesign();
  return (
    <View
      testID={testID}
      accessible
      accessibilityLabel={label ? `${value} ${label}` : value}
      style={{ flexDirection: 'row', alignItems: 'center', gap: t.layout.label, flexShrink: 1, minWidth: 0 }}
    >
      {Icon ? (
        <Icon size={t.icon.small} strokeWidth={iconStroke(t.icon.small)} color={c.muted} style={{ flexShrink: 0 }} />
      ) : null}
      <Copy
        mono={mono}
        size="label"
        numberOfLines={1}
        ellipsizeMode="tail"
        style={{ flexShrink: 1, minWidth: 0, fontWeight: '500' }}
      >
        {value}
      </Copy>
      {label ? (
        <Copy muted size="metadata" numberOfLines={1} ellipsizeMode="tail" style={{ flexShrink: 1, minWidth: 0 }}>
          {label}
        </Copy>
      ) : null}
    </View>
  );
}
