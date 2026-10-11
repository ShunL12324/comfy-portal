import { uniqueCopyName } from '@/features/workflow/utils/copy-name';
import { useEnvironmentStore } from '../stores/environment-store';
import { defineBuiltIn, type BuiltInEnvironment } from './define';
import { minimaxH3VideoTurbo } from './minimax-h3-video-turbo';
import { qwenImage21 } from './qwen-image-2-1';

export type { BuiltInEnvironment } from './define';

/**
 * Example environments shipped with the app. Each is added once to the user's
 * own list, tagged in its name, as if they had made it: editable, deletable and
 * launched like any other environment. A deleted example is not re-added, and a
 * later app version never overwrites the copy a user already has.
 */
export const BUILT_IN_ENVIRONMENTS: readonly BuiltInEnvironment[] = [qwenImage21, minimaxH3VideoTurbo].map(
  defineBuiltIn,
);

export const EXAMPLE_TAG = 'Example';

export function getBuiltInEnvironment(id: string | undefined): BuiltInEnvironment | undefined {
  return BUILT_IN_ENVIRONMENTS.find((item) => item.id === id);
}

/** Adds every example not yet added to the user's environments. Call once the store has hydrated. */
export function seedBuiltInEnvironments(): void {
  const { environments, seededExamples, addEnvironment, markExamplesSeeded } = useEnvironmentStore.getState();
  const pending = BUILT_IN_ENVIRONMENTS.filter((example) => !seededExamples.includes(example.id));
  if (!pending.length) return;
  const names = environments.map((item) => item.name);
  for (const example of pending) {
    const { name, description, models, extensions, workflows, ollamaModels } = example.environment;
    const tagged = uniqueCopyName(`${name} · ${EXAMPLE_TAG}`, names);
    names.push(tagged);
    addEnvironment({ name: tagged, description, models, extensions, workflows, ollamaModels });
  }
  markExamplesSeeded(pending.map((example) => example.id));
}
