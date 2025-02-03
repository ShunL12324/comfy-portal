import { Node, NodeMeta, NodeType } from '@/types/node';
import { randomUUID } from 'expo-crypto';
export const TEST_DATA = {
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
}

export function parseNodes(rawData: string): Node[] {
  try {
    const jsonObject = JSON.parse(rawData);
    const nodes: Node[] = [];
    // iterate over the json object
    for (const entry of Object.entries(jsonObject)) {
      const id = randomUUID();
      const key = entry[0];
      const value = entry[1];

      // some value check
      if (!value || typeof value !== 'object' || !('class_type' in value) || !('inputs' in value) || typeof value.class_type !== 'string' || typeof value.inputs !== 'object') {
        console.warn(`failed to parse node ${key}`, value);
        continue;
      }

      const node: Node = {
        id,
        index: parseInt(key),
        type: value.class_type as NodeType,
        inputs: value.inputs as Record<string, any>,
      };

      if ('_meta' in value && typeof value._meta === 'object') {
        node._meta = value._meta as NodeMeta;
      }

      nodes.push(node);
    }

    // sort the nodes by index
    nodes.sort((a, b) => a.index - b.index);

    return nodes;
  } catch (error) {
    console.error(error);
    return [];
  }
}