import { Model } from '@/features/server/types';
import { useServersStore } from '@/features/server/stores/server-store';
import { useNodeSchema } from '@/hooks/useNodeSchema';

import { SelectorOption } from '../types';

export interface ModelOptionsRequest {
  serverId: string;
  /** Node class the picker belongs to, e.g. `CheckpointLoaderSimple`. */
  classType?: string;
  /** Input the picker edits, e.g. `ckpt_name`. */
  inputName?: string;
  /**
   * Model folders backing this input. Only used for preview images and as the
   * fallback list — the server's own node definition is the source of truth.
   */
  folders: string[];
}

export interface ModelOptions {
  options: SelectorOption[];
  /**
   * True when the list came from the server's node definition, which means it
   * is exhaustive: a value missing from it genuinely does not exist there.
   */
  fromServer: boolean;
}

function previewUri(model: Model | undefined): string | undefined {
  if (!model?.hasPreview || !model.previewPath) return undefined;
  return model.previewPath.startsWith('file://') ? model.previewPath : `file://${model.previewPath}`;
}

/**
 * The options for one model picker.
 *
 * Sourced from `/object_info`, where ComfyUI reports the legal values for each
 * input directly. That is the only complete answer: the folder scan behind
 * `server.models` is limited to a hardcoded folder whitelist, while
 * `folder_paths.add_model_folder_path()` lets any custom node register folders
 * we've never heard of. It also covers inputs that aren't files at all — RMBG's
 * `model` is the fixed enum `['RMBG-2.0', 'INSPYRENET', 'BEN', 'BEN2']`, which
 * no amount of folder scanning would ever produce.
 *
 * The folder scan still supplies preview images, which `/object_info` has no
 * notion of, and stands in as the list while the schema loads or when the
 * server can't be reached.
 */
export function useModelOptions({
  serverId,
  classType,
  inputName,
  folders,
}: ModelOptionsRequest): ModelOptions {
  const server = useServersStore((state) => state.servers.find((s) => s.id === serverId));
  const schema = useNodeSchema(serverId, classType);

  const scanned = new Map<string, Model>();
  for (const model of server?.models ?? []) {
    if (folders.includes(model.type)) scanned.set(model.name, model);
  }

  const toOption = (name: string): SelectorOption => ({
    value: name,
    label: name.replace(/\.[^/.]+$/, ''),
    image: previewUri(scanned.get(name)),
    serverName: server?.name,
  });

  const input = inputName ? schema?.inputs[inputName] : undefined;
  if (input?.kind === 'combo') {
    return { options: input.options.map(toOption), fromServer: true };
  }

  // Deduplicate by filename, not by extension-stripped label: an input backed by
  // two folders can list the same file twice, but `foo.safetensors` and
  // `foo.ckpt` are different models and collapsing them can drop the one the
  // workflow actually references.
  const options: SelectorOption[] = [];
  for (const name of scanned.keys()) options.push(toOption(name));
  return { options, fromServer: false };
}
