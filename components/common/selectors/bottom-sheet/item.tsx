import { Pressable } from '@/components/ui/pressable';
import { Copy, useDesign } from '@/components/ui/design-system/primitives';
import { View as Box } from '@/components/ui/view';
import { Check } from '@/constants/icons';
import { designTokens as t, iconStroke, type DesignColors } from '@/constants/design-tokens';
import { SelectorOption } from '../types';

interface ItemProps {
  item: SelectorOption;
  isSelected: boolean;
  onSelect: (value: string) => void;
}

/** One selection treatment for text rows, model rows and image/model tiles. */
export function getOptionSurfaceStyle(c: DesignColors, isSelected: boolean, media = false) {
  return {
    backgroundColor: isSelected ? c.tintSurface : media ? c.card : 'transparent',
    borderRadius: media ? t.radius.panel : t.radius.control,
    borderWidth: 1,
    borderColor: isSelected ? c.tint : media ? c.line : 'transparent',
  };
}

export function Item({ item, isSelected, onSelect }: ItemProps) {
  const c = useDesign();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={item.label}
      accessibilityState={{ selected: isSelected }}
      aria-pressed={isSelected}
      testID={`selector-option-${item.value}`}
      onPress={() => onSelect(item.value)}
      className="active:opacity-pressed"
      style={getOptionSurfaceStyle(c, isSelected)}
    >
      <Box
        style={{
          minHeight: t.height.touch,
          paddingHorizontal: t.layout.rowX,
          paddingVertical: t.layout.rowY,
          gap: t.layout.related,
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        {item.icon}
        <Box style={{ flex: 1, gap: t.layout.label }}>
          <Copy size="body" style={{ color: c.ink, fontWeight: '500' }} numberOfLines={2} ellipsizeMode="tail">
            {item.label}
          </Copy>
          {item.description && (
            <Copy size="label" muted numberOfLines={2}>
              {item.description}
            </Copy>
          )}
        </Box>
        <Box style={{ width: t.icon.control, height: t.icon.control }}>
          {isSelected && (
            <Check
              width={t.icon.control}
              height={t.icon.control}
              strokeWidth={iconStroke(t.icon.control)}
              color={c.tint}
            />
          )}
        </Box>
      </Box>
    </Pressable>
  );
}
