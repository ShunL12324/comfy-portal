import { ModelSelector } from '@/components/common/selectors/model';
import { NumberInput } from '@/components/self-ui/number-input';
import { NativeSwitch } from '@/components/ui/design-system/native-controls';
import { Action, Copy } from '@/components/ui/design-system/primitives';
import { designTokens as t } from '@/constants/design-tokens';
import { Trash2 } from '@/constants/icons';
import { LORA_STRENGTH, loraStrengthLabel } from '@/features/comfy-node/utils/lora-strength';
import { View } from 'react-native';
import SubItem from './sub-item';

interface LoraRowProps {
  /** Row heading; also names the switch and remove button for screen readers. */
  title: string;
  serverId: string;
  lora: string;
  onLoraChange: (lora: string) => void;
  /**
   * Node class and input whose option list the picker shows. Power Lora
   * declares no LoRA input of its own, so it borrows `LoraLoader`'s.
   */
  classType: string;
  inputName?: string;
  /** `undefined` means linked to another node: shown, not editable. */
  strength: number | undefined;
  onStrengthChange: (strength: number) => void;
  /**
   * `shared` when one strength drives model and clip, `model` when it is the
   * model half of a split (or the only strength of a model-only loader).
   */
  strengthKind: 'shared' | 'model';
  /** Present only when the row carries a separate clip strength. */
  clipStrength?: number;
  onClipStrengthChange?: (strength: number) => void;
  /** Present only for loaders that can switch a row off (Power Lora). */
  enabled?: boolean;
  onEnabledChange?: (enabled: boolean) => void;
  onRemove?: () => void;
}

function StrengthField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | undefined;
  onChange: (value: number) => void;
}) {
  return (
    <SubItem title={label}>
      {value === undefined ? (
        <Copy size="metadata" muted>
          Linked to another node.
        </Copy>
      ) : (
        <NumberInput
          value={value}
          onChange={onChange}
          minValue={LORA_STRENGTH.min}
          maxValue={LORA_STRENGTH.max}
          step={LORA_STRENGTH.step}
          decimalPlaces={LORA_STRENGTH.decimalPlaces}
        />
      )}
    </SubItem>
  );
}

/**
 * One LoRA: picker, strength (plus clip strength where the node splits it),
 * and, where the node has them, an on/off switch and a remove button. Core
 * `LoraLoader` / `LoraLoaderModelOnly` and each Power Lora row render through
 * this, so they share labels, the stepper, its step and its formatting.
 */
export default function LoraRow({
  title,
  serverId,
  lora,
  onLoraChange,
  classType,
  inputName = 'lora_name',
  strength,
  onStrengthChange,
  strengthKind,
  clipStrength,
  onClipStrengthChange,
  enabled,
  onEnabledChange,
  onRemove,
}: LoraRowProps) {
  const hasActions = !!onEnabledChange || !!onRemove;
  return (
    <SubItem
      title={title}
      rightComponent={
        hasActions ? (
          <View className="flex-row items-center" style={{ gap: t.node.inlineGap }}>
            {onEnabledChange ? (
              <NativeSwitch label={`Enable ${title}`} value={enabled === true} onValueChange={onEnabledChange} />
            ) : null}
            {onRemove ? <Action kind="text" icon={Trash2} label={`Remove ${title}`} onPress={onRemove} /> : null}
          </View>
        ) : undefined
      }
    >
      <View style={{ gap: t.node.labelGap, opacity: enabled === false ? t.opacity.disabled : 1 }}>
        <ModelSelector
          value={lora}
          onChange={onLoraChange}
          type={['loras']}
          classType={classType}
          inputName={inputName}
          serverId={serverId}
        />
        <StrengthField label={loraStrengthLabel(strengthKind)} value={strength} onChange={onStrengthChange} />
        {onClipStrengthChange ? (
          <StrengthField label="Clip Strength" value={clipStrength} onChange={onClipStrengthChange} />
        ) : null}
      </View>
    </SubItem>
  );
}
