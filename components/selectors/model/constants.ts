import { SelectorOption } from '../types';
import { Model, Server } from '@/types/server';

export function createModelOptions(servers: Server[], type: string = 'checkpoints'): SelectorOption[] {
  return servers.flatMap((server, serverIndex) =>
    (server.models || [])
      .filter((model) => model.type === type)
      .map((model, modelIndex) => ({
        value: model.name,
        label: model.name.replace(/\.[^/.]+$/, ''),
        image: model.hasPreview && model.previewPath ?
          model.previewPath.startsWith('file://') ?
            model.previewPath :
            `file://${model.previewPath}` :
          undefined,
        serverName: server.name,
        key: `${server.id}_${model.type}_${serverIndex}_${modelIndex}_${model.name}`,
      }))
      .filter(
        (model, index, self) =>
          index === self.findIndex((m) => m.label === model.label),
      ),
  );
} 