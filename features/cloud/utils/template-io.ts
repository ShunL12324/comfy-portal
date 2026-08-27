import type { GpuTemplate } from '../types';

/**
 * Templates travel as plain JSON.
 *
 * They're self-contained by design — workflows are embedded rather than
 * referenced — so a file is enough to move one between devices or hand it to
 * someone else. No account, no sync service.
 */

/** Bumped if the shape changes in a way an older app can't read. */
export const TEMPLATE_FILE_VERSION = 1;

export interface TemplateFile {
  kind: 'comfy-portal-gpu-template';
  version: number;
  template: Omit<GpuTemplate, 'id' | 'createdAt' | 'updatedAt'>;
}

export function exportTemplate(template: GpuTemplate): string {
  const { id, createdAt, updatedAt, ...rest } = template;
  void id;
  void createdAt;
  void updatedAt;
  return JSON.stringify({ kind: 'comfy-portal-gpu-template', version: TEMPLATE_FILE_VERSION, template: rest } satisfies TemplateFile, null, 2);
}

export class TemplateImportError extends Error {}

export function parseTemplateFile(text: string): Omit<GpuTemplate, 'id' | 'createdAt' | 'updatedAt'> {
  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new TemplateImportError('That file is not valid JSON.');
  }

  // Accept either the wrapper or a bare template object — someone editing one
  // by hand shouldn't have to remember the envelope.
  const template = parsed?.kind === 'comfy-portal-gpu-template' ? parsed.template : parsed;

  if (!template || typeof template.name !== 'string') {
    throw new TemplateImportError('That does not look like a template — no name field.');
  }
  if (parsed?.version && parsed.version > TEMPLATE_FILE_VERSION) {
    throw new TemplateImportError('That template was made by a newer version of the app.');
  }

  const models = Array.isArray(template.models) ? template.models : [];
  for (const model of models) {
    if (typeof model?.url !== 'string' || typeof model?.type !== 'string') {
      throw new TemplateImportError('One of the models is missing a url or type.');
    }
  }

  return {
    name: template.name,
    gpuQuery: typeof template.gpuQuery === 'string' ? template.gpuQuery : '',
    disk: typeof template.disk === 'number' ? template.disk : 100,
    models,
    extensions: Array.isArray(template.extensions) ? template.extensions.filter((e: unknown) => typeof e === 'string') : [],
    workflows: Array.isArray(template.workflows)
      ? template.workflows.filter((w: any) => w && typeof w.name === 'string' && w.data)
      : [],
  };
}
