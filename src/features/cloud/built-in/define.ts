import type { Environment, EnvironmentModel } from '../types';
import { environmentContentSchema } from '../utils/environment-io';

/** A ComfyUI API-format graph: node id → class and inputs, links as `[nodeId, outputIndex]`. */
export type ApiWorkflow = Record<
  string,
  { class_type: string; inputs: Record<string, unknown>; _meta?: { title?: string } }
>;

/** One built-in recipe as authored: plain data, workflows in ComfyUI API format. */
export interface BuiltInEnvironmentSource {
  /** Route id. A readable slug, never a UUID, so it cannot collide with a user's environment. */
  id: string;
  /** Bumped whenever the recipe changes. Copies a user already made are never touched. */
  version: number;
  /** GPU memory the default workflows need at their default settings, in GB. */
  gpuMemoryGb: number;
  /** Oldest ComfyUI release that has every core node and model the workflows use. */
  minComfyUI: string;
  name: string;
  description: string;
  models: (EnvironmentModel & { filename: string; sizeBytes: number })[];
  extensions: string[];
  workflows: { name: string; data: ApiWorkflow }[];
}

export type EnvironmentContent = Omit<Environment, 'id' | 'createdAt' | 'updatedAt'>;

export interface BuiltInEnvironment extends Omit<BuiltInEnvironmentSource, 'models' | 'extensions' | 'workflows'> {
  /** Shaped like a stored environment so the recipe pages can show it unchanged. */
  environment: Environment;
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

/**
 * Validates a recipe through the same schema an imported file goes through,
 * then freezes it: built-in data is shared by every screen and must never be
 * edited in place. Using an example copies it into the store instead.
 */
export function defineBuiltIn({
  id,
  version,
  gpuMemoryGb,
  minComfyUI,
  ...content
}: BuiltInEnvironmentSource): BuiltInEnvironment {
  return deepFreeze({
    id,
    version,
    gpuMemoryGb,
    minComfyUI,
    name: content.name,
    description: content.description,
    environment: { ...environmentContentSchema.parse(content), id, createdAt: '', updatedAt: '' },
  });
}
