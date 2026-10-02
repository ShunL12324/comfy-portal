import { Action, Copy } from '@/components/ui/design-system/primitives';
import { Plus } from '@/constants/icons';
import { loraStrengthValue } from '@/features/comfy-node/utils/lora-strength';
import {
  PowerLoraValue,
  hasSeparateClipStrength,
  newPowerLoraValue,
  nextPowerLoraKey,
  patchPowerLoraValue,
  powerLoraEntries,
} from '@/features/comfy-node/utils/power-lora';
import { useWorkflowStore } from '@/features/workflow/stores/workflow-store';
import { View } from 'react-native';
import BaseNode from '../../common/base-node';
import LoraRow from '../../common/lora-row';
import { NodeEditorProps } from '../../common/schema-node';

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
        const patch = (next: Partial<PowerLoraValue>) => setRow(key, patchPowerLoraValue(value, next));
        const strength = loraStrengthValue(value.strength);
        return (
          <LoraRow
            key={key}
            title={`LoRA ${index + 1}`}
            serverId={serverId}
            lora={value.lora ?? 'None'}
            onLoraChange={(lora) => patch({ lora })}
            classType="LoraLoader"
            strengthKind={separate ? 'model' : 'shared'}
            strength={strength}
            onStrengthChange={(next) => patch({ strength: next })}
            clipStrength={separate ? loraStrengthValue(value.strengthTwo) : undefined}
            onClipStrengthChange={separate ? (strengthTwo) => patch({ strengthTwo }) : undefined}
            enabled={value.on === true}
            onEnabledChange={(on) => patch({ on })}
            onRemove={() => setRow(key, undefined)}
          />
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
