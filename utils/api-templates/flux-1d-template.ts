import { GenerationParams } from '@/types/preset';
import { ApiCall } from '../api-call';
import { BaseApiCallTemplate } from './base-template';

const FLUX_1D_TEMPLATE = {
  "6": {
    "inputs": {
      "text": "",
      "clip": ["34", 0]
    },
    "class_type": "CLIPTextEncode",
    "_meta": {
      "title": "CLIP Text Encode (Prompt)"
    }
  },
  "8": {
    "inputs": {
      "samples": ["28", 0],
      "vae": ["14", 0]
    },
    "class_type": "VAEDecode",
    "_meta": {
      "title": "VAE Decode"
    }
  },
  "9": {
    "inputs": {
      "filename_prefix": "ComfyUI",
      "images": ["8", 0]
    },
    "class_type": "SaveImage",
    "_meta": {
      "title": "Save Image"
    }
  },
  "13": {
    "inputs": {
      "guidance": 3,
      "conditioning": ["6", 0]
    },
    "class_type": "FluxGuidance",
    "_meta": {
      "title": "FluxGuidance"
    }
  },
  "14": {
    "inputs": {
      "vae_name": "ae.safetensors"
    },
    "class_type": "VAELoader",
    "_meta": {
      "title": "Load VAE"
    }
  },
  "28": {
    "inputs": {
      "add_noise": "enable",
      "noise_seed": 1068645015994398,
      "steps": 20,
      "cfg": 1,
      "sampler_name": "euler_ancestral",
      "scheduler": "normal",
      "start_at_step": 0,
      "end_at_step": 10000,
      "return_with_leftover_noise": "disable",
      "model": ["36", 0],
      "positive": ["13", 0],
      "negative": ["29", 0],
      "latent_image": ["35", 0]
    },
    "class_type": "KSamplerAdvanced",
    "_meta": {
      "title": "KSampler (Advanced)"
    }
  },
  "29": {
    "inputs": {
      "text": "",
      "clip": ["34", 0]
    },
    "class_type": "CLIPTextEncode",
    "_meta": {
      "title": "CLIP Text Encode (Prompt)"
    }
  },
  "34": {
    "inputs": {
      "clip_name1": "clip_l.safetensors",
      "clip_name2": "t5xxl_fp16.safetensors",
      "type": "flux",
      "device": "default"
    },
    "class_type": "DualCLIPLoader",
    "_meta": {
      "title": "DualCLIPLoader"
    }
  },
  "35": {
    "inputs": {
      "width": 1024,
      "height": 1024,
      "batch_size": 1
    },
    "class_type": "EmptyLatentImage",
    "_meta": {
      "title": "Empty Latent Image"
    }
  },
  "36": {
    "inputs": {
      "unet_name": "",
      "weight_dtype": "default"
    },
    "class_type": "UNETLoader",
    "_meta": {
      "title": "Load Diffusion Model"
    }
  }
} as const;

export class Flux1DApiCallTemplate extends BaseApiCallTemplate {
  protected getInitialNodeIds(): { modelNodeId: string; clipNodeId: string; startLoraNodeId: number; } {
    return {
      modelNodeId: "36", // UNETLoader
      clipNodeId: "34",  // DualCLIPLoader
      startLoraNodeId: 43
    };
  }

  getTemplate(): ApiCall {
    return JSON.parse(JSON.stringify(FLUX_1D_TEMPLATE));
  }

  fillTemplate(params: GenerationParams): ApiCall {
    const apiCall = this.getTemplate();

    // Update UNET loader
    apiCall[36].inputs.unet_name = params.model;

    // Handle LoRAs and get the last node IDs
    const { modelNodeId, clipNodeId } = this.handleLoras(apiCall, params);

    // Update KSampler connections to use the last LoRA node
    apiCall[28].inputs.model = [modelNodeId, 0];

    // Update CLIPTextEncode connections to use the last LoRA node
    apiCall[6].inputs.clip = [clipNodeId, 1];
    apiCall[29].inputs.clip = [clipNodeId, 1];

    // Update other parameters
    apiCall[28].inputs.noise_seed = params.useRandomSeed ? Math.floor(Math.random() * Number.MAX_SAFE_INTEGER) : params.seed;
    apiCall[28].inputs.steps = params.steps;
    apiCall[28].inputs.cfg = params.cfg;
    apiCall[28].inputs.sampler_name = params.sampler;
    apiCall[28].inputs.scheduler = params.scheduler;

    // Update prompts
    apiCall[6].inputs.text = params.prompt;
    apiCall[29].inputs.text = params.negativePrompt;

    // Update image dimensions
    apiCall[35].inputs.width = params.width;
    apiCall[35].inputs.height = params.height;

    return apiCall;
  }
} 