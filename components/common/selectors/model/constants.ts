import { useServersStore } from '@/features/server/stores/server-store';
import { SelectorOption } from '../types';
export function createModelOptions(serverId: string, type: string | string[] = 'checkpoints'): SelectorOption[] {
  const server = useServersStore((state) => state.servers.find((s) => s.id === serverId));
  const types = Array.isArray(type) ? type : [type];

  return (server?.models || [])
    .filter((model) => types.includes(model.type))
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
    .filter((model, index, self) => index === self.findIndex((m) => m.label === model.label));
}
