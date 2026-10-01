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

/** Smallest disk provisioning accepts; the user may always choose more. */
export const MIN_DISK_GB = 60;
export const DISK_HEADROOM_GB = 40;

function knownSize(model: EnvironmentModel) {
  return Number.isFinite(model.sizeBytes) && model.sizeBytes! > 0 ? model.sizeBytes! : undefined;
}

/**
 * Launch disk planning. Only some hosts (Civitai) report file sizes, so known
 * sizes suggest a default but never raise the floor: the user picks the size.
 */
export function planDisk(models: EnvironmentModel[]) {
  const knownBytes = models.reduce((sum, model) => sum + (knownSize(model) ?? 0), 0);
  const knownGb = Math.ceil(knownBytes / 1024 ** 3);
  const unknownCount = models.filter((model) => knownSize(model) === undefined).length;
  return {
    minGb: MIN_DISK_GB,
    defaultGb: Math.max(MIN_DISK_GB, Math.ceil((knownGb + DISK_HEADROOM_GB) / 10) * 10),
    knownGb,
    unknownCount,
  };
}

export function diskHint({ knownGb, unknownCount }: ReturnType<typeof planDisk>): string {
  const unknown = unknownCount === 1 ? '1 model has an unknown size' : `${unknownCount} models have unknown sizes`;
  if (!knownGb && !unknownCount) return 'Choose room for extensions and outputs.';
  if (!knownGb) return `${unknown}; choose enough disk for them and outputs.`;
  if (!unknownCount) return `Models need about ${knownGb} GB; leave room for outputs.`;
  return `Known models need about ${knownGb} GB; ${unknown}. Choose enough disk for all of them.`;
}

export function totalModelBytes(models: EnvironmentModel[]): number | undefined {
  if (models.some((model) => model.sizeBytes === undefined || !Number.isFinite(model.sizeBytes) || model.sizeBytes < 0))
    return undefined;
  return models.reduce((sum, model) => sum + model.sizeBytes!, 0);
}
