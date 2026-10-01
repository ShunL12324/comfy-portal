import { Copy, useDesign } from '@/components/ui/design-system/primitives';
import { Menu, MenuItem } from '@/components/ui/menu';
import { designTokens as t, iconStroke } from '@/constants/design-tokens';
import { MoreHorizontal, type LucideIcon } from '@/constants/icons';
import { Pressable, StyleSheet, View } from 'react-native';

export interface OverflowEntry<K extends string> {
  key: K;
  label: string;
  icon: LucideIcon;
}

/**
 * The `⋯` at the far right of a bar, for actions too rare to earn an icon of
 * their own. Rendered in a native modal so it opens above the full-screen
 * viewer and inside History's form sheet alike, where a portal to the app root
 * would land behind them. Callers omit it when there is nothing to put in it.
 */
export function ViewerOverflowMenu<K extends string>({
  entries,
  disabled,
  onSelect,
}: {
  entries: OverflowEntry<K>[];
  disabled?: boolean;
  onSelect: (key: K) => void;
}) {
  const c = useDesign();
  return (
    <Menu
      useRNModal
      placement="bottom right"
      offset={t.layout.label}
      trigger={(triggerProps) => (
        <Pressable
          {...triggerProps}
          accessibilityRole="button"
          accessibilityLabel="More actions"
          accessibilityState={{ disabled }}
          disabled={disabled}
          style={({ pressed }) => [
            styles.trigger,
            { opacity: disabled ? t.opacity.disabled : pressed ? t.opacity.pressed : 1 },
          ]}
        >
          <MoreHorizontal size={t.icon.large} color={c.ink} strokeWidth={iconStroke(t.icon.large)} />
        </Pressable>
      )}
      style={{
        backgroundColor: c.overlay,
        borderColor: c.line,
        borderWidth: StyleSheet.hairlineWidth,
        borderRadius: t.radius.control,
        padding: t.layout.label,
      }}
    >
      {entries.map(({ key, label, icon: Icon }) => (
        <MenuItem key={key} textValue={label} onPress={() => onSelect(key)} style={styles.item}>
          <View style={styles.itemRow}>
            <Icon size={t.icon.control} color={c.ink} strokeWidth={iconStroke(t.icon.control)} />
            <Copy size="label">{label}</Copy>
          </View>
        </MenuItem>
      ))}
    </Menu>
  );
}

const styles = StyleSheet.create({
  trigger: {
    width: t.height.touch,
    height: t.height.touch,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: t.radius.control,
  },
  item: {
    minHeight: t.height.touch,
    paddingVertical: 0,
    paddingHorizontal: t.layout.rowX,
    borderRadius: t.radius.small,
  },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: t.layout.related },
});
