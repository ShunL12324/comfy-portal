const DEFAULT_API_CALL_TEMPLATE = {
  "1": {
    "inputs": {
      "ckpt_name": ""
    },
    "class_type": "CheckpointLoaderSimple",
    "_meta": {
      "title": "Checkpoint Loader (Simple)"
    }
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

const FLUX_1_D_API_CALL_TEMPLATE = {
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
      "filename_prefix": "ComfyUI-Portal",
      "images": ["8", 0]
    },
    "class_type": "SaveImage",
    "_meta": {
      "title": "Save Image"
    }
  },
  "13": {
    "inputs": {
      "guidance": 1.5,
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