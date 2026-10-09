import { uniqueCopyName } from '@/features/workflow/utils/copy-name';
import { useEnvironmentStore } from '../stores/environment-store';
import { defineBuiltIn, type BuiltInEnvironment } from './define';
import { minimaxH3VideoTurbo } from './minimax-h3-video-turbo';
import { qwenImage21 } from './qwen-image-2-1';

export type { BuiltInEnvironment } from './define';

/**
 * Example environments shipped with the app. They are shown beside the user's
 * own environments, never written into the store: using one makes an ordinary,
 * editable copy, so a later app version can improve an example without
 * touching anything a user already made from it.
 */
export const BUILT_IN_ENVIRONMENTS: readonly BuiltInEnvironment[] = [qwenImage21, minimaxH3VideoTurbo].map(
  defineBuiltIn,
);

export function getBuiltInEnvironment(id: string | undefined): BuiltInEnvironment | undefined {
  return BUILT_IN_ENVIRONMENTS.find((item) => item.id === id);
}

/** Adds the user's own copy of an example and returns its id. */
export function copyBuiltInEnvironment(example: BuiltInEnvironment): string {
  const { environments, addEnvironment } = useEnvironmentStore.getState();
  const { name, description, models, extensions, workflows, ollamaModels } = example.environment;
  return addEnvironment({
    name: uniqueCopyName(
      name,
      environments.map((item) => item.name),
    ),
    description,
    models,
    extensions,
    workflows,
    ollamaModels,
  });
}
