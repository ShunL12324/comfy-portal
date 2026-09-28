import type { Workflow } from '@/features/workflow/types';
import type { ModelType } from '@/services/model-url';

export type CloudProvider = 'vast' | 'runpod';

export interface EnvironmentModel {
  url: string;
  type: ModelType;
  filename?: string;
  sizeBytes?: number;
  label?: string;
  pageUrl?: string;
}

export interface EnvironmentWorkflow {
  name: string;
  data: Workflow;
}

/** Portable installation recipe. Hardware belongs to a launch, never here. */
export interface Environment {
  id: string;
  name: string;
  description: string;
  extensions: string[];
  workflows: EnvironmentWorkflow[];
  models: EnvironmentModel[];
  ollamaModels?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface HardwareSelection {
  provider: CloudProvider;
  offerId: string;
  diskGb: number;
  gpuName: string;
  gpuCount: number;
  memoryGb: number;
  pricePerHour: number;
  quotedAt: number;
  /** GPU-only starting rates must never be displayed as a complete invoice. */
  priceScope: 'instance' | 'gpu-starting';
}

export interface LaunchSpecification {
  environment: Environment;
  hardware: HardwareSelection;
}

export const DISK_HEADROOM_GB = 40;

/** Minimum planning estimate, not a claim that unknown model sizes are zero. */
export function estimateDiskGb(models: EnvironmentModel[]): number {
  const known = models.reduce(
    (sum, model) => sum + (Number.isFinite(model.sizeBytes) && model.sizeBytes! > 0 ? model.sizeBytes! : 0),
    0,
  );
  return Math.max(60, Math.ceil(known / 1024 ** 3) + DISK_HEADROOM_GB);
}

export function totalModelBytes(models: EnvironmentModel[]): number | undefined {
  if (models.some((model) => model.sizeBytes === undefined || !Number.isFinite(model.sizeBytes) || model.sizeBytes < 0))
    return undefined;
  return models.reduce((sum, model) => sum + model.sizeBytes!, 0);
}
