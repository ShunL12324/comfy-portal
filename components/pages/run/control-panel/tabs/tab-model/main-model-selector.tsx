import { ModelSelector } from '@/components/selectors/model';
import { usePresetsStore } from '@/store/presets';
import { View } from 'react-native';

interface MainModelSelectorProps {
  serverId: string;
  presetId: string;
}

function Sd15Sdxl({ serverId, presetId }: { serverId: string; presetId: string }) {
  const preset = usePresetsStore((state) => state.presets.find((p) => p.id === presetId));
  const updatePreset = usePresetsStore((state) => state.updatePreset);

  return (
    <View>
      <ModelSelector
        serverId={serverId}
        value={preset?.params.model || ''}
        onChange={(value) => {
          if (preset?.params) {
            updatePreset(presetId, {
              params: { ...preset.params, model: value },
            });
          }
        }}
        type="checkpoints"
      />
    </View>
  );
}

function FluxDevAllInOne({ serverId, presetId }: { serverId: string; presetId: string }) {
  return <View />;
}

function FluxDevUnet({ serverId, presetId }: { serverId: string; presetId: string }) {
  return <View />;
}
export default function MainModelSelector({ serverId, presetId }: MainModelSelectorProps) {
  const preset = usePresetsStore((state) => state.presets.find((p) => p.id === presetId));
  const updatePreset = usePresetsStore((state) => state.updatePreset);

  return (
    <View>
      {(() => {
        if (!preset?.params.templateType) return <Sd15Sdxl serverId={serverId} presetId={presetId} />;

        switch (preset.params.templateType) {
          case 'flux_dev_all_in_one':
            return <FluxDevAllInOne serverId={serverId} presetId={presetId} />;
          case 'flux_dev_unet':
            return <FluxDevUnet serverId={serverId} presetId={presetId} />;
          case 'sd_15_sdxl':
          default:
            return <Sd15Sdxl serverId={serverId} presetId={presetId} />;
        }
      })()}
    </View>
  );
}
