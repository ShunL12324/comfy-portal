import type { Workflow } from '@/features/workflow/types';
import type { ModelType } from '@/services/model-url';

export interface TemplateModel {
  /** Direct download URL, already normalised by services/model-url.ts. */
  url: string;
  /** Folder under `models/` — decides whether ComfyUI can find the file. */
  type: ModelType;
  /** Needed when the URL's basename isn't a filename (always so for Civitai). */
  filename?: string;
  /** For the disk estimate; not every host reports it. */
  sizeBytes?: number;
  /** Human label, e.g. the Civitai model name. Display only. */
  label?: string;
}

export interface TemplateWorkflow {
  name: string;
  /**
   * The workflow itself, not a reference.
   *
   * WorkflowRecord is tied to a serverId, and a template is built before its
   * server exists. Embedding also makes a template self-contained, so exporting
   * one carries its workflows rather than a set of dangling ids.
   */
  data: Workflow;
}

export interface GpuTemplate {
  id: string;
  name: string;
  /** git URLs of custom nodes to clone into `custom_nodes/`. */
  extensions: string[];
  workflows: TemplateWorkflow[];
  models: TemplateModel[];
  /** Disk to request, GB. Defaults from the model total plus headroom. */
  disk: number;
  /** vast's short GPU name, e.g. "RTX 4090". Seeds the offer search. */
  gpuQuery: string;
  createdAt: string;
  updatedAt: string;
}

/** Models plus ComfyUI, torch and the image itself. */
export const DISK_HEADROOM_GB = 40;

export function estimateDiskGb(models: TemplateModel[]): number {
  const known = models.reduce((sum, m) => sum + (m.sizeBytes ?? 0), 0);
  return Math.max(60, Math.ceil(known / 1024 ** 3) + DISK_HEADROOM_GB);
}
