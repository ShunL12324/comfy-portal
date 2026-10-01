import { environmentContentSchema, exportEnvironment, parseEnvironmentFile } from '@/features/cloud/utils/environment-io';
import type { Environment } from '@/features/cloud/types';
const recipe: Environment = {
  id: 'env',
  name: 'Studio',
  description: '',
  models: [],
  workflows: [],
  extensions: [],
  createdAt: '',
  updatedAt: '',
};
test('portable exports omit local identity and hardware, and round trip validated content', () => {
  const data = JSON.parse(exportEnvironment({ ...recipe, diskGb: 80 } as Environment));
  expect(data.environment).not.toHaveProperty('id');
  expect(data.environment).not.toHaveProperty('diskGb');
  expect(parseEnvironmentFile(JSON.stringify(data)).name).toBe('Studio');
});
test('invalid model sizes, traversal filenames and malformed workflows cannot enter storage', () => {
  for (const invalid of [
    { models: [{ url: 'https://example.com/a', type: 'checkpoints', sizeBytes: -1 }] },
    { models: [{ url: 'https://example.com/a', type: 'checkpoints', filename: '@/features/cloud/a' }] },
    { workflows: [{ name: 'broken', data: { '1': { inputs: [] } } }] },
    { extensions: ['https://github.com'] },
  ])
    expect(() => environmentContentSchema.parse({ ...recipe, ...invalid })).toThrow();
});
test('unknown future export versions fail instead of silently losing fields', () => {
  expect(() =>
    parseEnvironmentFile(
      JSON.stringify({
        kind: 'comfy-portal-environment',
        version: 99,
        environment: recipe,
      }),
    ),
  ).toThrow();
});

test('validated environment graphs do not share input references with an import draft', () => {
  const graph = { '1': { class_type: 'KSampler', inputs: { seed: 42 } } };
  const validated = environmentContentSchema.parse({ ...recipe, workflows: [{ name: 'Portrait', data: graph }] });
  graph['1'].inputs.seed = 99;
  expect(validated.workflows[0].data['1'].inputs.seed).toBe(42);
});

test('existing exports import unchanged: disk size is chosen at launch, not stored in the recipe', () => {
  const { id: _id, createdAt: _created, updatedAt: _updated, ...content } = recipe;
  const model = { url: 'https://example.com/a.safetensors', type: 'loras' };
  const file = { kind: 'comfy-portal-environment', version: 2, environment: { ...content, diskGb: 120, models: [model] } };
  const parsed = parseEnvironmentFile(JSON.stringify(file));
  expect(parsed).not.toHaveProperty('diskGb');
  expect(parsed.models).toEqual([model]);
});
