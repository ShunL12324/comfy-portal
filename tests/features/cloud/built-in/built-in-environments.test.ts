import { readFileSync } from 'fs';
import { join } from 'path';
import { BUILT_IN_ENVIRONMENTS, copyBuiltInEnvironment, getBuiltInEnvironment } from '@/features/cloud/built-in';
import type { ApiWorkflow, BuiltInEnvironmentSource } from '@/features/cloud/built-in/define';
import { minimaxH3VideoTurbo } from '@/features/cloud/built-in/minimax-h3-video-turbo';
import { qwenImage21 } from '@/features/cloud/built-in/qwen-image-2-1';
import { useEnvironmentStore } from '@/features/cloud/stores/environment-store';
import { environmentContentSchema } from '@/features/cloud/utils/environment-io';
import { MODEL_TYPES } from '@/services/model-url';

jest.mock('@/utils/uuid', () => {
  let next = 0;
  return { generateUUID: () => 'environment-' + ++next };
});

const SOURCES: BuiltInEnvironmentSource[] = [qwenImage21, minimaxH3VideoTurbo];

/**
 * Output types of every node class the examples use, in output order, as
 * ComfyUI declares them. A link's index must exist here, and its type must
 * match what the receiving input expects (`INPUT_TYPES` below).
 */
const OUTPUTS: Record<string, string[]> = {
  // nodes.py
  UNETLoader: ['MODEL'],
  CLIPLoader: ['CLIP'],
  VAELoader: ['VAE'],
  LoraLoaderModelOnly: ['MODEL'],
  EmptyLatentImage: ['LATENT'],
  KSampler: ['LATENT'],
  VAEDecode: ['IMAGE'],
  LoadImage: ['IMAGE', 'MASK'],
  SaveImage: [],
  // comfy_extras: nodes_qwen.py, nodes_resolution.py, nodes_images.py, nodes_post_processing.py
  QwenImage21Cache: ['MODEL'],
  TextEncodeQwenImage21: ['CONDITIONING', 'CONDITIONING', 'LATENT'],
  ResolutionSelector: ['INT', 'INT'],
  GetImageSize: ['INT', 'INT', 'INT'],
  ImageScaleToTotalPixels: ['IMAGE'],
  // nodes_custom_sampler.py
  RandomNoise: ['NOISE'],
  BasicGuider: ['GUIDER'],
  KSamplerSelect: ['SAMPLER'],
  BasicScheduler: ['SIGMAS'],
  ManualSigmas: ['SIGMAS'],
  SamplerCustomAdvanced: ['LATENT', 'LATENT'],
  // nodes_minimax_h3.py, nodes_audio.py, nodes_video.py
  MiniMaxH3ImageToVideo: ['CONDITIONING', 'LATENT'],
  MiniMaxH3SigmaShift: ['MODEL'],
  VAEDecodeAudio: ['AUDIO'],
  CreateVideo: ['VIDEO'],
  SaveVideo: ['VIDEO'],
};

/** What well-known input names must be linked to. */
const INPUT_TYPES: Record<string, string> = {
  model: 'MODEL',
  clip: 'CLIP',
  vae: 'VAE',
  audio_vae: 'VAE',
  positive: 'CONDITIONING',
  negative: 'CONDITIONING',
  conditioning: 'CONDITIONING',
  latent_image: 'LATENT',
  samples: 'LATENT',
  pixels: 'IMAGE',
  images: 'IMAGE',
  image: 'IMAGE',
  first_frame: 'IMAGE',
  last_frame: 'IMAGE',
  sigmas: 'SIGMAS',
  sampler: 'SAMPLER',
  noise: 'NOISE',
  guider: 'GUIDER',
  audio: 'AUDIO',
  video: 'VIDEO',
};

/** Loader inputs that name a model file, and the folder that file must be in. */
const MODEL_INPUTS: Record<string, string> = {
  unet_name: 'diffusion_models',
  clip_name: 'text_encoders',
  vae_name: 'vae',
  lora_name: 'loras',
  ckpt_name: 'checkpoints',
};

const OUTPUT_NODES = new Set(['SaveImage', 'SaveVideo']);

/** Node classes with an editor. The registry imports native UI, so read its keys rather than import it. */
function editorClassTypes() {
  const source = readFileSync(
    join(__dirname, '../../../../src/features/comfy-node/components/node/types/index.ts'),
    'utf8',
  );
  const map = source.slice(source.indexOf('export const nodeComponentMap'));
  const body = map.slice(0, map.indexOf('\n};'));
  const entries = [...body.matchAll(/^\s*'([^']+)':\s*(\w+),/gm)];
  return new Map(entries.map(([, classType, component]) => [classType, component]));
}

function isLink(value: unknown): value is [string, number] {
  return Array.isArray(value) && value.length === 2 && typeof value[0] === 'string' && typeof value[1] === 'number';
}

describe.each(SOURCES.map((source) => [source.name, source] as const))('%s', (_name, source) => {
  test('passes the schema imported environments go through', () => {
    expect(environmentContentSchema.safeParse(source).success).toBe(true);
    expect(source.description.trim().length).toBeGreaterThan(0);
  });

  test('pins every model to an HTTPS file in a ComfyUI model folder, with its size', () => {
    expect(source.models.length).toBeGreaterThan(0);
    const seen = new Set<string>();
    for (const model of source.models) {
      const url = new URL(model.url);
      expect(url.protocol).toBe('https:');
      expect(MODEL_TYPES).toContain(model.type);
      expect(model.filename).toBe(decodeURIComponent(url.pathname.split('/').pop()!));
      // A revision, not a branch: `resolve/<40-hex commit>/…`.
      if (url.hostname === 'huggingface.co') expect(url.pathname).toMatch(/\/resolve\/[0-9a-f]{40}\//);
      expect(model.sizeBytes).toBeGreaterThan(0);
      expect(model.pageUrl).toMatch(/^https:\/\//);
      const key = `${model.type}/${model.filename}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });

  test('gives every node class a dedicated editor', () => {
    const editors = editorClassTypes();
    for (const workflow of source.workflows)
      for (const node of Object.values(workflow.data)) {
        expect([workflow.name, node.class_type, editors.has(node.class_type)]).toEqual([
          workflow.name,
          node.class_type,
          true,
        ]);
        // The read-only editor is only for nodes with nothing to edit.
        if (editors.get(node.class_type) === 'ImmutableNode')
          expect([node.class_type, Object.values(node.inputs).every(isLink)]).toEqual([node.class_type, true]);
      }
  });

  test.each(source.workflows.map((workflow) => [workflow.name, workflow.data] as const))(
    '%s is a consistent graph',
    (_workflow, data: ApiWorkflow) => {
      const models = new Set(source.models.map((model) => `${model.type}/${model.filename}`));
      let outputs = 0;
      for (const [id, node] of Object.entries(data)) {
        const declared = OUTPUTS[node.class_type];
        expect([id, node.class_type, declared !== undefined]).toEqual([id, node.class_type, true]);
        if (OUTPUT_NODES.has(node.class_type)) outputs += 1;
        for (const [input, value] of Object.entries(node.inputs)) {
          if (isLink(value)) {
            const [from, index] = value;
            const upstream = data[from];
            expect([id, input, upstream !== undefined]).toEqual([id, input, true]);
            const types = OUTPUTS[upstream.class_type];
            expect([id, input, index < types.length]).toEqual([id, input, true]);
            // Autogrow sockets are `<group>.<slot>`: Qwen's reference images are `images.image_1`, ...
            const expected = INPUT_TYPES[input] ?? (input.startsWith('images.') ? 'IMAGE' : undefined);
            expect([id, input, types[index]]).toEqual([id, input, expected ?? types[index]]);
          } else if (MODEL_INPUTS[input]) {
            expect([id, input, models.has(`${MODEL_INPUTS[input]}/${value}`)]).toEqual([id, input, true]);
          }
        }
      }
      expect(outputs).toBeGreaterThan(0);
    },
  );
});

test('every model the examples ship is used by one of their workflows', () => {
  for (const source of SOURCES) {
    const referenced = new Set(
      source.workflows.flatMap((workflow) =>
        Object.values(workflow.data).flatMap((node) =>
          Object.entries(node.inputs)
            .filter(([input]) => MODEL_INPUTS[input])
            .map(([input, value]) => `${MODEL_INPUTS[input]}/${value}`),
        ),
      ),
    );
    for (const model of source.models) expect(referenced).toContain(`${model.type}/${model.filename}`);
  }
});

test('built-in ids are unique, readable and never look like a stored environment id', () => {
  const ids = BUILT_IN_ENVIRONMENTS.map((example) => example.id);
  expect(new Set(ids).size).toBe(ids.length);
  for (const id of ids) expect(id).toMatch(/^example-[a-z0-9-]+$/);
  expect(getBuiltInEnvironment('not-an-example')).toBeUndefined();
});

test('using an example adds an independent copy and leaves the built-in untouched', () => {
  const example = BUILT_IN_ENVIRONMENTS[0];
  const before = JSON.stringify(example);
  const id = copyBuiltInEnvironment(example);
  const copy = useEnvironmentStore.getState().getEnvironment(id)!;
  expect(copy.id).not.toBe(example.id);
  expect(copy.name).toBe(example.environment.name);
  expect(copy.models).toEqual(example.environment.models);
  expect(copy.workflows).toEqual(example.environment.workflows);
  expect(copy.models).not.toBe(example.environment.models);

  useEnvironmentStore.getState().updateEnvironment(id, { name: 'Mine', models: [] });
  const second = copyBuiltInEnvironment(example);
  expect(useEnvironmentStore.getState().getEnvironment(second)!.name).toBe(example.environment.name);
  expect(copyBuiltInEnvironment(example)).not.toBe(second);
  expect(useEnvironmentStore.getState().environments.map((item) => item.name)).toEqual([
    'Mine',
    example.environment.name,
    `${example.environment.name} copy`,
  ]);

  expect(JSON.stringify(example)).toBe(before);
  expect(Object.isFrozen(example.environment.models[0])).toBe(true);
  expect(() => {
    'use strict';
    (example.environment.models as unknown as unknown[]).push({});
  }).toThrow();
});
