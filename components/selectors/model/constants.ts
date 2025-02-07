import { useServersStore } from '@/store/servers';
import { SelectorOption } from '../types';
export function createModelOptions(
  serverId: string,
  type: string = 'checkpoints',
): SelectorOption[] {
  const server = useServersStore((state) => state.servers.find((s) => s.id === serverId));

  return (server?.models || [])
    .filter((model) => model.type === type)
    .map((model, modelIndex) => ({
      value: model.name,
      label: model.name.replace(/\.[^/.]+$/, ''),
      image:
        model.hasPreview && model.previewPath
          ? model.previewPath.startsWith('file://')
            ? model.previewPath
            : `file://${model.previewPath}`
          : undefined,
      serverName: server?.name,
      key: `${server?.id}_${model.type}_${modelIndex}_${model.name}`,
    }))
    .filter(
      (model, index, self) =>
        index === self.findIndex((m) => m.label === model.label),
    );
}
