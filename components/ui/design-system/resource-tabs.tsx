import { MotiView } from 'moti';
import { useReducedMotion } from 'react-native-reanimated';
import { Pressable } from '@/components/ui/pressable';
import { View } from '@/components/ui/view';
import { Copy, useDesign } from './primitives';
import { designTokens as t } from '@/constants/design-tokens';

/** Underline navigation for peer resource views; distinct from form segments. */
export function ResourceTabs({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  const c = useDesign();
  const reduced = useReducedMotion();
  return (
    <View testID="resource-tabs" accessibilityRole="tablist" style={{ flexDirection: 'row', height: t.height.touch }}>
      {options.map((option) => {
        const selected = option === value;
        return (
          <Pressable
            key={option}
            accessibilityRole="tab"
            accessibilityLabel={option}
            accessibilityState={{ selected }}
            aria-selected={selected}
            onPress={() => onChange(option)}
            style={{
              flex: 1,
              minWidth: 0,
              minHeight: t.height.touch,
              alignItems: 'center',
              justifyContent: 'center',
              gap: t.layout.related,
            }}
          >
            <Copy size="body" style={{ color: selected ? c.tint : c.muted, fontWeight: '500' }}>
              {option}
            </Copy>
            <MotiView
              testID={`resource-indicator-${option}`}
              pointerEvents="none"
              animate={{ opacity: selected ? 1 : 0 }}
              transition={{ type: 'timing', duration: reduced ? 0 : 160 }}
              style={{ height: 2, width: 120, maxWidth: '80%', borderRadius: t.radius.pill, backgroundColor: c.tint }}
            />
          </Pressable>
        );
      })}
    </View>
  );
}
