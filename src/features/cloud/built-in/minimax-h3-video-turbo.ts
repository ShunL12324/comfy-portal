import type { ApiWorkflow, BuiltInEnvironmentSource } from './define';

/**
 * MiniMax H3 video (with sound) through the lightx2v Turbo LoRA, 8 steps.
 *
 * Workflows follow the official ComfyUI templates (Comfy-Org/workflow_templates,
 * MIT): templates/video_minimax_h3_t2v.json and video_minimax_h3_i2v.json,
 * flattened from their shared "Image to Video (MiniMax H3)" subgraph into API
 * format with its turbo switch on. The turbo wiring follows the LoRA authors'
 * ComfyUI graph (github.com/ModelTC/Minimax-H3-Turbo,
 * example_workflows/video_minimax_h3_t2v_lightx2v_turbo.json, and its model
 * table): FL2VA Turbo 8-step v1.0 at strength 1, 8 steps, BasicScheduler
 * `simple`, sampler `euler`, no CFG (BasicGuider), and the shifts it was
 * distilled at, video 12 / audio 3 (also H3's built-in default; set
 * explicitly so a 768p LoRA's 6 / 3 is one edit away). 16:9 at 0.5 MP is
 * 960×544, the LoRA's training resolution; 124 frames is 5 s at 24 fps, the
 * model's trained minimum on its 17k+5 grid. Differences from the templates:
 * - The duration → frames math node is folded into a plain `length` of 124.
 * - Image to video sizes the canvas from the photo (the templates' own
 *   ImageScaleToTotalPixels → GetImageSize group): MiniMaxH3ImageToVideo
 *   stretches the first frame to the canvas, so a fixed 16:9 canvas would
 *   distort a portrait photo.
 * - CreateVideo keeps its automatic bit depth (the templates force 8-bit; same result for sRGB).
 *
 * Models:
 * - https://huggingface.co/Comfy-Org/MiniMax-H3 at commit
 *   e5eb578a89295337b8ff433a035929ce0279e0b6 (repackaged from
 *   MiniMaxAI/MiniMax-H3): the pruned INT8 FL2VA diffusion model, the NVFP4
 *   Qwen3-VL-32B text encoder (does not need a Blackwell GPU, per the repo),
 *   the INT8 video VAE and the audio VAE, the files the official templates
 *   load. Licence: MiniMax H3 Community License Agreement
 *   (https://huggingface.co/MiniMaxAI/MiniMax-H3/blob/main/LICENSE). It
 *   excludes the EU, the UK, South Korea and the US; commercial products over
 *   USD 20M yearly revenue need written approval and any commercial product
 *   must display "MiniMax H3".
 * - https://huggingface.co/lightx2v/Minimax-h3-Turbo at commit
 *   3ec17a324ced54151364f24f8b5fb6bf7e26414f: the ComfyUI build of the FL2VA
 *   Turbo 8-step v1.0 LoRA, linked from the official templates. Licence:
 *   Apache-2.0 (the base model's licence still applies to its use).
 * Sizes from the Hugging Face tree API.
 *
 * Needs ComfyUI 0.30.0+ (comfy_extras/nodes_minimax_h3.py); the LoRA
 * authors ask for 0.31.0+. ComfyUI's optimised INT8/NVFP4 kernels need
 * PyTorch built for CUDA 13; on older builds it falls back to slower
 * dequantising kernels.
 */

const H3 = 'https://huggingface.co/Comfy-Org/MiniMax-H3';
const H3_REVISION = 'e5eb578a89295337b8ff433a035929ce0279e0b6';
const TURBO = 'https://huggingface.co/lightx2v/Minimax-h3-Turbo';
const TURBO_REVISION = '3ec17a324ced54151364f24f8b5fb6bf7e26414f';
const file = (repo: string, revision: string, path: string) => ({
  url: `${repo}/resolve/${revision}/${path}`,
  pageUrl: `${repo}/blob/${revision}/${path}`,
  filename: path.split('/').pop()!,
});

const UNET = 'minimax_h3_fl2va_pruned_int8_convrot.safetensors';
const TEXT_ENCODER = 'qwen3vl_32b_minimax_h3_nvfp4_awq.safetensors';
const VIDEO_VAE = 'minimax_h3_video_vae_int8_convrot.safetensors';
const AUDIO_VAE = 'minimax_h3_audio_vae_fp32.safetensors';
const TURBO_LORA = 'minimax_h3_fl2v_turbo_8step_v1.0_comfyui_bf16.safetensors';

/** 124 frames: 5 s at 24 fps, the trained minimum on H3's 17k+5 frame grid. */
const LENGTH = 124;

/**
 * Model, text encoder, VAEs and the turbo sampling chain, shared by both
 * workflows. Node 8 is each workflow's MiniMaxH3ImageToVideo.
 */
const turboPipeline: ApiWorkflow = {
  '1': { class_type: 'UNETLoader', inputs: { unet_name: UNET, weight_dtype: 'default' } },
  '2': {
    class_type: 'LoraLoaderModelOnly',
    inputs: { model: ['1', 0], lora_name: TURBO_LORA, strength_model: 1 },
    _meta: { title: 'Turbo LoRA (8 steps)' },
  },
  '3': {
    class_type: 'MiniMaxH3SigmaShift',
    inputs: { model: ['2', 0], shift_video: 12, shift_audio: 3 },
  },
  '4': { class_type: 'CLIPLoader', inputs: { clip_name: TEXT_ENCODER, type: 'minimax', device: 'default' } },
  '5': { class_type: 'VAELoader', inputs: { vae_name: VIDEO_VAE }, _meta: { title: 'Video VAE' } },
  '6': { class_type: 'VAELoader', inputs: { vae_name: AUDIO_VAE }, _meta: { title: 'Audio VAE' } },
  '9': { class_type: 'RandomNoise', inputs: { noise_seed: 222367220930554 } },
  '10': { class_type: 'BasicGuider', inputs: { model: ['3', 0], conditioning: ['8', 0] } },
  '11': { class_type: 'KSamplerSelect', inputs: { sampler_name: 'euler' } },
  '12': { class_type: 'BasicScheduler', inputs: { model: ['3', 0], scheduler: 'simple', steps: 8, denoise: 1 } },
  '13': {
    class_type: 'SamplerCustomAdvanced',
    inputs: { noise: ['9', 0], guider: ['10', 0], sampler: ['11', 0], sigmas: ['12', 0], latent_image: ['8', 1] },
  },
  // The latent carries video and audio together; each VAE decodes its own half.
  '14': { class_type: 'VAEDecode', inputs: { samples: ['13', 0], vae: ['5', 0] } },
  '15': { class_type: 'VAEDecodeAudio', inputs: { samples: ['13', 0], vae: ['6', 0] } },
  '16': { class_type: 'CreateVideo', inputs: { images: ['14', 0], audio: ['15', 0], fps: 24 } },
  '17': {
    class_type: 'SaveVideo',
    inputs: { video: ['16', 0], filename_prefix: 'video/MiniMax_H3', format: 'auto', 'format.codec': 'auto' },
  },
};

export const minimaxH3VideoTurbo: BuiltInEnvironmentSource = {
  id: 'example-minimax-h3-video-turbo',
  version: 1,
  gpuMemoryGb: 48,
  minComfyUI: '0.31.0',
  name: 'MiniMax H3 Video · Turbo',
  description:
    'Text to video and image to video with sound, MiniMax H3 sped up to 8 steps by the lightx2v Turbo LoRA: 5 s clips at 960×544, 24 fps, saved as MP4. Plan on a 48 GB GPU (an estimate; the official docs give no memory or time figures) and about 64 GB of system RAM. MiniMax H3 Community License: not licensed for use in the EU, UK, South Korea or the US.',
  models: [
    { ...file(H3, H3_REVISION, `diffusion_models/${UNET}`), type: 'diffusion_models', sizeBytes: 20970379616 },
    { ...file(H3, H3_REVISION, `text_encoders/${TEXT_ENCODER}`), type: 'text_encoders', sizeBytes: 15687142551 },
    { ...file(H3, H3_REVISION, `vae/${VIDEO_VAE}`), type: 'vae', sizeBytes: 2811065184 },
    { ...file(H3, H3_REVISION, `vae/${AUDIO_VAE}`), type: 'vae', sizeBytes: 605254808 },
    { ...file(TURBO, TURBO_REVISION, TURBO_LORA), type: 'loras', sizeBytes: 1956193000 },
  ],
  extensions: [],
  workflows: [
    {
      name: 'MiniMax H3 · Text to video',
      data: {
        ...turboPipeline,
        '7': {
          class_type: 'ResolutionSelector',
          inputs: { aspect_ratio: '16:9 (Widescreen)', megapixels: 0.5, multiple: 32 },
        },
        '8': {
          class_type: 'MiniMaxH3ImageToVideo',
          inputs: {
            clip: ['4', 0],
            vae: ['5', 0],
            prompt:
              'integrated_multimodal_description: [Shot 1] A golden retriever puppy runs across a sunlit meadow toward the camera, ears flapping, slow motion, shallow depth of field, warm late-afternoon light. [Shot 2] Close-up as the puppy stops, tilts its head and barks happily at the camera.\noverall_soundscape: Soft wind through tall grass, birdsong, the patter of small paws, two short happy barks.\nnon_diegetic_music: Light acoustic guitar, cheerful and gentle.',
            width: ['7', 0],
            height: ['7', 1],
            length: LENGTH,
          },
          _meta: { title: 'Prompt' },
        },
      },
    },
    {
      name: 'MiniMax H3 · Image to video',
      data: {
        ...turboPipeline,
        '18': { class_type: 'LoadImage', inputs: { image: 'example.png' }, _meta: { title: 'First frame' } },
        // About the LoRA's 0.5 MP training size, keeping the photo's aspect ratio, on H3's 32 px grid.
        '19': {
          class_type: 'ImageScaleToTotalPixels',
          inputs: { image: ['18', 0], upscale_method: 'lanczos', megapixels: 0.5, resolution_steps: 32 },
        },
        '7': { class_type: 'GetImageSize', inputs: { image: ['19', 0] } },
        '8': {
          class_type: 'MiniMaxH3ImageToVideo',
          inputs: {
            clip: ['4', 0],
            vae: ['5', 0],
            prompt:
              'integrated_multimodal_description: For the target video, at 0.00 seconds into the target video, <Picture 1> (from [Shot 1]) is fully referenced.\n[Shot 1] Preserve the subject, clothing and scene from <Picture 1>; the camera slowly pushes in as the subject turns toward the light and smiles.\noverall_soundscape: Quiet room tone and soft ambient sound that match the scene.\nnon_diegetic_music: N/A',
            width: ['7', 0],
            height: ['7', 1],
            length: LENGTH,
            first_frame: ['19', 0],
          },
          _meta: { title: 'Prompt' },
        },
      },
    },
  ],
};
