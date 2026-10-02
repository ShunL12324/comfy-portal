import { ModelSelector } from '@/components/common/selectors/model';
import { NumberInput } from '@/components/self-ui/number-input';
import { NativeSwitch } from '@/components/ui/design-system/native-controls';
import { Action, Copy } from '@/components/ui/design-system/primitives';
import { designTokens as t } from '@/constants/design-tokens';
import { Plus, Trash2 } from '@/constants/icons';
import {
  PowerLoraValue,
  hasSeparateClipStrength,
  newPowerLoraValue,
  nextPowerLoraKey,
  powerLoraEntries,
} from '@/features/comfy-node/utils/power-lora';
import { useWorkflowStore } from '@/features/workflow/stores/workflow-store';
import { View } from 'react-native';
import BaseNode from '../../common/base-node';
import { NodeEditorProps } from '../../common/schema-node';
import SubItem from '../../common/sub-item';

/** rgthree steps strengths by 0.05 and doesn't bound them. */
const STRENGTH_STEP = 0.05;

/**
 * rgthree's Power Lora Loader: any number of LoRAs, each toggled, picked and
 * weighted on its own row. The rows are object inputs (`lora_1`, ...) the
 * server reads as a whole, so every edit writes a new row object.
 *
 * The node declares no LoRA input of its own, so the picker borrows core
 * `LoraLoader`'s `lora_name` list — the same `loras` folder.
 */
export default function PowerLoraLoader({ node, serverId, workflowId }: NodeEditorProps) {
  const updateNodeInput = useWorkflowStore((state) => state.updateNodeInput);
  const entries = powerLoraEntries(node.inputs);

  const setRow = (key: string, value: PowerLoraValue | undefined) => updateNodeInput(workflowId, node.id, key, value);

  return (
    <BaseNode node={node}>
      {entries.length === 0 ? (
        <Copy size="metadata" muted>
          No LoRAs yet.
        </Copy>
      ) : null}
      {entries.map(({ key, value }, index) => {
        const separate = hasSeparateClipStrength(value);
        const patch = (next: Partial<PowerLoraValue>) => setRow(key, { ...value, ...next });
        return (
          <SubItem
            key={key}
            title={`LoRA ${index + 1}`}
            rightComponent={
              <View className="flex-row items-center" style={{ gap: t.node.inlineGap }}>
                <NativeSwitch
                  label={`Enable LoRA ${index + 1}`}
                  value={value.on === true}
                  onValueChange={(on) => patch({ on })}
                />
                <Action
                  kind="text"
                  icon={Trash2}
                  label={`Remove LoRA ${index + 1}`}
                  onPress={() => setRow(key, undefined)}
                />
              </View>
            }
          >
            <View style={{ gap: t.node.labelGap, opacity: value.on ? 1 : t.opacity.disabled }}>
              <ModelSelector
                value={value.lora ?? 'None'}
                onChange={(lora) => patch({ lora })}
                type={['loras']}
                classType="LoraLoader"
                inputName="lora_name"
                serverId={serverId}
              />
              <SubItem title={separate ? 'Model Strength' : 'Strength'}>
                <NumberInput
                  value={value.strength}
                  onChange={(strength) => patch({ strength })}
                  step={STRENGTH_STEP}
                  decimalPlaces={2}
                />
              </SubItem>
              {separate ? (
                <SubItem title="Clip Strength">
                  <NumberInput
                    value={value.strengthTwo ?? value.strength}
                    onChange={(strengthTwo) => patch({ strengthTwo })}
                    step={STRENGTH_STEP}
                    decimalPlaces={2}
                  />
                </SubItem>
              ) : null}
            </View>
          </SubItem>
        );
      })}
      <View className="flex-row">
        <Action
          kind="text"
          icon={Plus}
          small
          onPress={() => setRow(nextPowerLoraKey(node.inputs), newPowerLoraValue())}
        >
          Add LoRA
        </Action>
      </View>
    </BaseNode>
  );
}
