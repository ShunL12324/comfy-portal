import { GenerationParams, LoraConfig } from '@/types/generation';

const DEFAULT_PRESET = {
  "1": {
    "inputs": {
      "ckpt_name": "STOIQOAfroditeFLUXXL_F1DAlpha.safetensors"
    },
    "class_type": "CheckpointLoaderSimple",
    "_meta": {
      "title": "Checkpoint Loader (Simple)"
    }
  },
  "2": {
    "inputs": {
      "seed": 284011923044208,
      "steps": 20,
      "cfg": 8,
      "sampler_name": "euler",
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
    "_meta": {
      "title": "KSampler"
    }
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
    "_meta": {
      "title": "Set CLIP Last Layer"
    }
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
    "_meta": {
      "title": "CLIP Text Encode"
    }
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
    "_meta": {
      "title": "CLIP Text Encode"
    }
  },
  "6": {
    "inputs": {
      "width": 512,
      "height": 512,
      "batch_size": 1
    },
    "class_type": "EmptyLatentImage",
    "_meta": {
      "title": "Empty Latent Image"
    }
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
    "_meta": {
      "title": "VAE Decode"
    }
  },
  "8": {
    "inputs": {
      "images": [
        "7",
        0
      ]
    },
    "class_type": "PreviewImage",
    "_meta": {
      "title": "Preview Image"
    }
  }
} as const;

export interface PresetNode {
  inputs: Record<string, any>;
  class_type: string;
  _meta?: {
    title?: string;
  };
}

export type Preset = Record<string, PresetNode>;

function createLoraNode(
  nodeId: string,
  lora: LoraConfig,
  modelConnection: [string, number],
  clipConnection: [string, number]
): PresetNode {
  return {
    inputs: {
      lora_name: lora.name,
      strength_model: lora.strengthModel,
      strength_clip: lora.strengthClip,
      model: modelConnection,
      clip: clipConnection,
    },
    class_type: "LoraLoader",
    _meta: {
      title: "LoRA Loader"
    }
  };
}

export function createPreset(params: GenerationParams): Preset {
  // Create a deep copy of the default preset
  const preset = JSON.parse(JSON.stringify(DEFAULT_PRESET)) as Preset;

  // Update checkpoint loader
  preset[1].inputs.ckpt_name = params.model;

  // Handle LoRA nodes if present
  if (params.loras && params.loras.length > 0) {
    // Filter out LoRAs with empty names
    const validLoras = params.loras.filter(lora => lora.name.trim() !== '');

    if (validLoras.length > 0) {
      let lastModelNodeId = "1";  // Start from checkpoint loader
      let lastClipNodeId = "3";   // Start from CLIPSetLastLayer
      let nextNodeId = 9;         // Start LoRA nodes from ID 9

      // Create LoRA nodes
      validLoras.forEach((lora) => {
        const nodeId = nextNodeId.toString();
        preset[nodeId] = createLoraNode(
          nodeId,
          lora,
          [lastModelNodeId, 0],
          [lastClipNodeId, lastClipNodeId === "3" ? 0 : 1]
        );

        lastModelNodeId = nodeId;
        lastClipNodeId = nodeId;
        nextNodeId++;
      });

      // Update KSampler connections to use the last LoRA node
      preset[2].inputs.model = [lastModelNodeId, 0];

      // Update CLIPTextEncode connections to use the last LoRA node
      preset[4].inputs.clip = [lastModelNodeId, 1];
      preset[5].inputs.clip = [lastModelNodeId, 1];
    }
  }

  // Update other parameters
  preset[2].inputs.seed = params.useRandomSeed ? Math.floor(Math.random() * Number.MAX_SAFE_INTEGER) : params.seed;
  preset[2].inputs.steps = params.steps;
  preset[2].inputs.cfg = params.cfg;
  preset[2].inputs.sampler_name = params.sampler;
  preset[2].inputs.scheduler = params.scheduler;

  // Update prompts
  preset[4].inputs.text = params.prompt;
  preset[5].inputs.text = params.negativePrompt;

  // Update image dimensions
  preset[6].inputs.width = params.width;
  preset[6].inputs.height = params.height;

  return preset;
}