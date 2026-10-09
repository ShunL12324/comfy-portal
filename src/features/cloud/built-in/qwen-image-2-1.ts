import type { BuiltInEnvironmentSource } from './define';

/**
 * Qwen Image 2.1: generate and edit in one environment.
 *
 * Workflows follow the official ComfyUI templates (Comfy-Org/workflow_templates,
 * MIT): templates/image_qwen_image_2_1_t2i.json and
 * templates/image_qwen_image_2_1_image_edit.json, flattened from their
 * subgraphs into API format. Differences, all at the templates' own defaults:
 * - The optional prompt enhancer (TextGenerate on a Qwen3.5 9B checkpoint) is
 *   left out. It is off by default, but ComfyUI validates every linked node,
 *   so keeping it would still mean a 9.5 GB download per workflow.
 * - SaveImage instead of SaveImageAdvanced (both write an 8-bit sRGB PNG).
 * - Edit: `resolution` 1024 instead of 0. Zero samples at the photo's own
 *   size, which for a 12 MP phone photo is a 4K canvas; 1024 is the node's
 *   default and about 1 MP. One reference image instead of two.
 * - Generate: the Resolution Selector rounds to 32, as the template's note advises.
 * - Generate · Turbo (8 steps) is not an official template. It applies the
 *   official Turbo LoRA (Comfy-Org repackage of Qwen/Qwen-Image-2.1-Turbo:
 *   "Uses 8 steps ... the LoRA extraction with the base model") with the
 *   Turbo checkpoint's own schedule, `sample_sigmas` in
 *   https://huggingface.co/Qwen/Qwen-Image-2.1-Turbo/blob/d65dbc9a7e8f6b5479e33dee6030eaab2a906509/model_index.json,
 *   at CFG 1.
 *
 * Models: https://huggingface.co/Comfy-Org/Qwen-Image-2.1 at commit
 * a3c1a9e2efcba96124a9dc8600c0c07d6f5e68aa, repackaged from Qwen/Qwen-Image-2.1
 * and Qwen/Qwen-Image-2.1-Turbo. Licence for every file: Qwen Research License
 * (`qwen-research`, https://huggingface.co/Qwen/Qwen-Image-2.1/blob/main/LICENSE),
 * non-commercial use only. Sizes from the Hugging Face tree API.
 *
 * Needs ComfyUI 0.37.0+ (comfy/ldm/qwen_image21, TextEncodeQwenImage21 and
 * QwenImage21Cache in comfy_extras/nodes_qwen.py first ship in v0.37.0).
 */

const REPO = 'https://huggingface.co/Comfy-Org/Qwen-Image-2.1';
const REVISION = 'a3c1a9e2efcba96124a9dc8600c0c07d6f5e68aa';
const file = (path: string) => ({
  url: `${REPO}/resolve/${REVISION}/${path}`,
  pageUrl: `${REPO}/blob/${REVISION}/${path}`,
  filename: path.split('/').pop()!,
});

const UNET = 'qwen_image_2.1_int8_convrot.safetensors';
const TEXT_ENCODER = 'qwen3vl_8b_int8_convrot.safetensors';
const VAE = 'qwen_image_2.1_vae_bf16.safetensors';
const TURBO_LORA = 'qwen_image_2.1_turbo_lora_avg_rank_178_bf16.safetensors';

/** The Turbo checkpoint's saved 8-step schedule, then the final 0. */
const TURBO_SIGMAS = '1.0, 0.978453, 0.95418, 0.926626, 0.89508, 0.845148, 0.704534, 0.414568, 0';

const PROMPT =
  'A cozy ramen shop on a rainy night, warm paper lanterns, a hand-painted sign above the door that reads "Comfy Portal", steam rising from the counter, reflections on wet cobblestones, cinematic photograph, 35mm, rich color.';

/** The shared loaders every workflow starts from. */
const loaders = {
  '1': { class_type: 'UNETLoader', inputs: { unet_name: UNET, weight_dtype: 'default' } },
  '3': { class_type: 'CLIPLoader', inputs: { clip_name: TEXT_ENCODER, type: 'qwen_image', device: 'default' } },
  '4': { class_type: 'VAELoader', inputs: { vae_name: VAE } },
};

export const qwenImage21: BuiltInEnvironmentSource = {
  id: 'example-qwen-image-2-1',
  version: 1,
  gpuMemoryGb: 24,
  minComfyUI: '0.37.0',
  name: 'Qwen Image 2.1',
  description:
    'Generate and edit images with Qwen Image 2.1, plus an 8-step Turbo generate. All three workflows share one INT8 model, text encoder and VAE. 24 GB of GPU memory is comfortable at 1 MP. Qwen Research License: non-commercial use only.',
  models: [
    { ...file(`diffusion_models/${UNET}`), type: 'diffusion_models', sizeBytes: 7256783064 },
    { ...file(`text_encoders/${TEXT_ENCODER}`), type: 'text_encoders', sizeBytes: 9350798360 },
    { ...file(`vae/${VAE}`), type: 'vae', sizeBytes: 675509688 },
    { ...file(`loras/${TURBO_LORA}`), type: 'loras', sizeBytes: 913314512 },
  ],
  extensions: [],
  workflows: [
    {
      name: 'Qwen Image 2.1 · Generate',
      data: {
        ...loaders,
        '2': {
          class_type: 'QwenImage21Cache',
          inputs: { model: ['1', 0], device: 'auto', dtype: 'default' },
        },
        '5': {
          class_type: 'TextEncodeQwenImage21',
          inputs: { clip: ['3', 0], prompt: PROMPT, negative_prompt: '', resolution: 1024 },
          _meta: { title: 'Prompt' },
        },
        '6': {
          class_type: 'ResolutionSelector',
          inputs: { aspect_ratio: '1:1 (Square)', megapixels: 1, multiple: 32 },
        },
        '7': {
          class_type: 'EmptyLatentImage',
          inputs: { width: ['6', 0], height: ['6', 1], batch_size: 1 },
        },
        '8': {
          class_type: 'KSampler',
          inputs: {
            model: ['2', 0],
            positive: ['5', 0],
            negative: ['5', 1],
            latent_image: ['7', 0],
            seed: 447606998181262,
            steps: 25,
            cfg: 1,
            sampler_name: 'euler',
            scheduler: 'simple',
            denoise: 1,
          },
        },
        '9': { class_type: 'VAEDecode', inputs: { samples: ['8', 0], vae: ['4', 0] } },
        '10': { class_type: 'SaveImage', inputs: { images: ['9', 0], filename_prefix: 'Qwen_image_2.1' } },
      },
    },
    {
      name: 'Qwen Image 2.1 · Edit',
      data: {
        ...loaders,
        '2': {
          class_type: 'QwenImage21Cache',
          inputs: { model: ['1', 0], device: 'auto', dtype: 'default' },
        },
        '5': { class_type: 'LoadImage', inputs: { image: 'example.png' }, _meta: { title: 'Image to edit' } },
        '6': {
          class_type: 'TextEncodeQwenImage21',
          inputs: {
            clip: ['3', 0],
            vae: ['4', 0],
            prompt: 'Turn this photo into a soft watercolor painting. Keep the composition, the people and their poses unchanged.',
            negative_prompt: '',
            resolution: 1024,
            'images.image_1': ['5', 0],
          },
          _meta: { title: 'Edit instruction' },
        },
        '7': {
          class_type: 'KSampler',
          inputs: {
            model: ['2', 0],
            positive: ['6', 0],
            negative: ['6', 1],
            // The encoder's empty latent, sized from the reference: any other size shifts the edit.
            latent_image: ['6', 2],
            seed: 891836227295375,
            steps: 25,
            cfg: 1,
            sampler_name: 'euler',
            scheduler: 'simple',
            denoise: 1,
          },
        },
        '8': { class_type: 'VAEDecode', inputs: { samples: ['7', 0], vae: ['4', 0] } },
        '9': { class_type: 'SaveImage', inputs: { images: ['8', 0], filename_prefix: 'Qwen_image_2.1_edit' } },
      },
    },
    {
      name: 'Qwen Image 2.1 · Generate · Turbo (8 steps)',
      data: {
        ...loaders,
        '2': {
          class_type: 'LoraLoaderModelOnly',
          inputs: { model: ['1', 0], lora_name: TURBO_LORA, strength_model: 1 },
          _meta: { title: 'Turbo LoRA' },
        },
        '5': {
          class_type: 'QwenImage21Cache',
          inputs: { model: ['2', 0], device: 'auto', dtype: 'default' },
        },
        '6': {
          class_type: 'TextEncodeQwenImage21',
          inputs: { clip: ['3', 0], prompt: PROMPT, negative_prompt: '', resolution: 1024 },
          _meta: { title: 'Prompt' },
        },
        '7': {
          class_type: 'ResolutionSelector',
          inputs: { aspect_ratio: '1:1 (Square)', megapixels: 1, multiple: 32 },
        },
        '8': {
          class_type: 'EmptyLatentImage',
          inputs: { width: ['7', 0], height: ['7', 1], batch_size: 1 },
        },
        '9': { class_type: 'RandomNoise', inputs: { noise_seed: 447606998181262 } },
        // CFG 1: no negative pass, so a plain guider.
        '10': { class_type: 'BasicGuider', inputs: { model: ['5', 0], conditioning: ['6', 0] } },
        '11': { class_type: 'KSamplerSelect', inputs: { sampler_name: 'euler' } },
        '12': { class_type: 'ManualSigmas', inputs: { sigmas: TURBO_SIGMAS }, _meta: { title: 'Turbo schedule' } },
        '13': {
          class_type: 'SamplerCustomAdvanced',
          inputs: {
            noise: ['9', 0],
            guider: ['10', 0],
            sampler: ['11', 0],
            sigmas: ['12', 0],
            latent_image: ['8', 0],
          },
        },
        '14': { class_type: 'VAEDecode', inputs: { samples: ['13', 0], vae: ['4', 0] } },
        '15': { class_type: 'SaveImage', inputs: { images: ['14', 0], filename_prefix: 'Qwen_image_2.1_turbo' } },
      },
    },
  ],
};
