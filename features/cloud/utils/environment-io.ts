import { z } from 'zod';
import type { Environment } from '../types';
import { parseWorkflowTemplate } from '@/features/workflow/utils/workflow-parser';

const modelSchema = z.object({
  url: z.url().refine((value) => /^https?:\/\//i.test(value), 'Use an HTTP or HTTPS model URL.'),
  type: z
    .string()
    .trim()
    .min(1)
    .regex(/^[a-zA-Z0-9_-]+$/, 'Invalid model folder.'),
  filename: z
    .string()
    .min(1)
    .refine((value) => !/[\\/]/.test(value) && value !== '..', 'Use a filename without a directory.')
    .optional(),
  sizeBytes: z.number().finite().nonnegative().optional(),
  label: z.string().optional(),
  pageUrl: z.url().optional(),
});

/** Parse external files before they enter persistent state; unknown fields are stripped. */
export const environmentContentSchema = z.object({
  name: z.string().trim().min(1, 'Enter an environment name.'),
  description: z.string().default(''),
  models: z.array(modelSchema).default([]),
  extensions: z
    .array(
      z.url().refine((value) => {
        const url = new URL(value);
        return (
          url.protocol === 'https:' &&
          url.hostname === 'github.com' &&
          url.pathname.split('/').filter(Boolean).length === 2
        );
      }, 'Use a GitHub repository URL.'),
    )
    .default([]),
  workflows: z
    .array(
      z.object({
        name: z.string().trim().min(1),
        data: z.record(z.string(), z.unknown()).transform((data, ctx) => {
          try {
            return parseWorkflowTemplate(data);
          } catch {
            ctx.addIssue({ code: 'custom', message: 'Invalid workflow node data.' });
            return z.NEVER;
          }
        }),
      }),
    )
    .default([]),
  ollamaModels: z.array(z.string().trim().min(1)).optional(),
});

export const ENVIRONMENT_FILE_VERSION = 2;
export function exportEnvironment(environment: Environment): string {
  return JSON.stringify(
    {
      kind: 'comfy-portal-environment',
      version: ENVIRONMENT_FILE_VERSION,
      environment: environmentContentSchema.parse(environment),
    },
    null,
    2,
  );
}
export function parseEnvironmentFile(text: string): Omit<Environment, 'id' | 'createdAt' | 'updatedAt'> {
  const envelope = z
    .object({
      kind: z.literal('comfy-portal-environment'),
      version: z.literal(ENVIRONMENT_FILE_VERSION),
      environment: environmentContentSchema,
    })
    .parse(JSON.parse(text));
  return envelope.environment;
}
