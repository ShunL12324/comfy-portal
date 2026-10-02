import { Action, useDesign } from '@/components/ui/design-system/primitives';
import { Input, InputField } from '@/components/ui/input';
import { View } from '@/components/ui/view';
import { Minus, Plus } from '@/constants/icons';
import { useState } from 'react';
import { designTokens as t } from '@/constants/design-tokens';
import { useCompactControls } from '@/components/ui/design-system/control-density';
interface NumberInputProps {
  value?: number;
  defaultValue?: number;
  minValue?: number;
  maxValue?: number;
  step?: number;
  onChange?: (value: number) => void;
  className?: string;
  decimalPlaces?: number;
}
export function NumberInput({
  value,
  defaultValue = 0,
  minValue = -Infinity,
  maxValue = Infinity,
  step = 1,
  onChange,
  className,
  decimalPlaces = 0,
}: NumberInputProps) {
  const c = useDesign();
  const compact = useCompactControls();
  const [committed, setCommitted] = useState(value ?? defaultValue);
  const [draft, setDraft] = useState(String(value ?? defaultValue));
  const [focused, setFocused] = useState(false);
  const base = value ?? committed;
  const displayed = focused ? draft : base.toFixed(decimalPlaces);
  const numeric = focused && draft.trim() && Number.isFinite(Number(draft)) ? Number(draft) : base;
  const commit = (next: number) => {
    const finite = Number.isFinite(next) ? next : (value ?? defaultValue);
    const clamped = Number(Math.min(maxValue, Math.max(minValue, finite)).toFixed(decimalPlaces));
    setDraft(String(clamped));
    setCommitted(clamped);
    onChange?.(clamped);
  };
  return (
    <View
      className={className}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: t.radius.control,
        backgroundColor: compact ? 'transparent' : c.well,
        minHeight: t.height.touch,
      }}
    >
      {compact && (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 4,
            bottom: 4,
            left: 0,
            right: 0,
            backgroundColor: c.well,
            borderRadius: t.radius.control,
          }}
        />
      )}
      <View style={{ flex: 1, minWidth: t.height.touch }}>
        <Action
          fill
          kind="text"
          icon={Minus}
          label="Decrease value"
          disabled={numeric <= minValue}
          onPress={() => commit(numeric - step)}
        />
      </View>
      <Input
        variant="outline"
        style={{ flex: 2, minWidth: 64, height: t.height.touch, borderWidth: 0, backgroundColor: 'transparent' }}
      >
        <InputField
          accessibilityLabel="Numeric value"
          keyboardType="numbers-and-punctuation"
          value={displayed}
          onChangeText={(text) => {
            if (/^-?\d*\.?\d*$/.test(text)) setDraft(text);
          }}
          onFocus={() => {
            setDraft(displayed);
            setFocused(true);
          }}
          onBlur={() => {
            commit(numeric);
            setFocused(false);
          }}
          onSubmitEditing={() => commit(numeric)}
          style={{
            // A style, not the prop: RN Web ignores TextInput's textAlign prop.
            textAlign: 'center',
            fontVariant: ['tabular-nums'],
            fontSize: compact ? t.node.body.fontSize : t.type.body,
            paddingHorizontal: t.layout.label,
            paddingVertical: 0,
            includeFontPadding: false,
            color: c.ink,
          }}
        />
      </Input>
      <View style={{ flex: 1, minWidth: t.height.touch }}>
        <Action
          fill
          kind="text"
          icon={Plus}
          label="Increase value"
          disabled={numeric >= maxValue}
          onPress={() => commit(numeric + step)}
        />
      </View>
    </View>
  );
}
