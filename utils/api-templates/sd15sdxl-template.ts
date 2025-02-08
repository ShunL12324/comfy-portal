import { GenerationParams } from '@/types/preset';
import { ApiCall } from '../api-call';
import { BaseApiCallTemplate } from './base-template';

const DEFAULT_TEMPLATE = {
  "1": {
    "inputs": {
      "ckpt_name": ""
    },
    "class_type": "CheckpointLoaderSimple",
  },
  "2": {
    "inputs": {
      "seed": 284011923044208,
      "steps": 30,
      "cfg": 8,
      "sampler_name": "euler_ancestral",
      "scheduler": "normal",
      "denoise": 1,
      "model": [
        "1",
        0
      ],
      "positive": [
        "4",
        0
      ],
      "negative": [
        "5",
        0
      ],
      "latent_image": [
        "6",
        0
      ]
    },
    "class_type": "KSampler",
  },
  "3": {
    "inputs": {
      "stop_at_clip_layer": -2,
      "clip": [
        "1",
        1
      ]
    },
    "class_type": "CLIPSetLastLayer",
  },
  "4": {
    "inputs": {
      "text": "",
      "clip": [
        "3",
        0
      ]
    },
    "class_type": "CLIPTextEncode",
  },
  "5": {
    "inputs": {
      "text": "",
      "clip": [
        "3",
        0
      ]
    },
    "class_type": "CLIPTextEncode",
  },
  "6": {
    "inputs": {
      "width": 512,
      "height": 512,
      "batch_size": 1
    },
    "class_type": "EmptyLatentImage",
  },
  "7": {
    "inputs": {
      "samples": [
        "2",
        0
      ],
      "vae": [
        "1",
        2
      ]
    },
    "class_type": "VAEDecode",
  },
  "8": {
    "inputs": {
      "images": [
        "7",
        0
      ]
    },
    "class_type": "PreviewImage",
  }
} as const;

export class SD15SDXLApiCallTemplate extends BaseApiCallTemplate {

  protected getInitialNodeIds(): { modelNodeId: string; clipNodeId: string; startLoraNodeId: number; } {
    return {
      modelNodeId: "1",
      clipNodeId: "3",
      startLoraNodeId: 9
    };
  }

  getTemplate(): ApiCall {
    return JSON.parse(JSON.stringify(DEFAULT_TEMPLATE));
  }

  fillTemplate(params: GenerationParams): ApiCall {
    const apiCall = this.getTemplate();

    // Update checkpoint loader
    apiCall[1].inputs.ckpt_name = params.model;

    // Update CLIP layer
    apiCall[3].inputs.stop_at_clip_layer = params.stopAtClipLayer;

    // Handle LoRAs and get the last node IDs
    const { modelNodeId, clipNodeId } = this.handleLoras(apiCall, params);

    // Update KSampler connections to use the last LoRA node
    apiCall[2].inputs.model = [modelNodeId, 0];

    // Update CLIPTextEncode connections to use the last LoRA node
    apiCall[4].inputs.clip = [clipNodeId, clipNodeId === "3" ? 0 : 1];
    apiCall[5].inputs.clip = [clipNodeId, clipNodeId === "3" ? 0 : 1];

    // Update other parameters
    apiCall[2].inputs.seed = params.useRandomSeed ? Math.floor(Math.random() * Number.MAX_SAFE_INTEGER) : params.seed;
    apiCall[2].inputs.steps = params.steps;
    apiCall[2].inputs.cfg = params.cfg;
    apiCall[2].inputs.sampler_name = params.sampler;
    apiCall[2].inputs.scheduler = params.scheduler;

    // Update prompts
    apiCall[4].inputs.text = params.positivePrompt;
    apiCall[5].inputs.text = params.negativePrompt;

    // Update image dimensions
    apiCall[6].inputs.width = params.width;
    apiCall[6].inputs.height = params.height;

    return apiCall;
  }
} 