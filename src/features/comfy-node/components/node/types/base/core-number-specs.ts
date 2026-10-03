import { NumberSpec } from '@/features/comfy-node/utils/schema-inputs';

/** ComfyUI's `MAX_RESOLUTION` (nodes.py). */
const MAX_RESOLUTION = 16384;

const STEPS: NumberSpec = { kind: 'int', min: 1, max: 10000, step: 1, default: 20 };
const CFG: NumberSpec = { kind: 'float', min: 0, max: 100, step: 0.1, default: 8 };
const DENOISE: NumberSpec = { kind: 'float', min: 0, max: 1, step: 0.01, default: 1 };
const BATCH_SIZE: NumberSpec = { kind: 'int', min: 1, max: 4096, step: 1, default: 1 };

/**
 * Number inputs of the core nodes with hand-built editors, as ComfyUI declares
 * them (`nodes.py`, `comfy_extras/`). They only stand in until the server's
 * own definition loads; the server's ranges always win.
 */
export const CORE_NUMBER_SPECS = {
  KSampler: { steps: STEPS, cfg: CFG, denoise: DENOISE },
  KSamplerAdvanced: {
    steps: STEPS,
    cfg: CFG,
    start_at_step: { kind: 'int', min: 0, max: 10000, step: 1, default: 0 },
    end_at_step: { kind: 'int', min: 0, max: 10000, step: 1, default: 10000 },
  },
  BasicScheduler: { steps: STEPS, denoise: DENOISE },
  ModelSamplingSD3: { shift: { kind: 'float', min: 0, max: 100, step: 0.01, default: 3 } },
  EmptyLatentImage: {
    width: { kind: 'int', min: 16, max: MAX_RESOLUTION, step: 8, default: 512 },
    height: { kind: 'int', min: 16, max: MAX_RESOLUTION, step: 8, default: 512 },
    batch_size: BATCH_SIZE,
  },
  ImageScaleBy: { scale_by: { kind: 'float', min: 0.01, max: 8, step: 0.01, default: 1 } },
  VAEEncodeForInpaint: { grow_mask_by: { kind: 'int', min: 0, max: 64, step: 1, default: 6 } },
  WanImageToVideo: {
    width: { kind: 'int', min: 16, max: MAX_RESOLUTION, step: 16, default: 832 },
    height: { kind: 'int', min: 16, max: MAX_RESOLUTION, step: 16, default: 480 },
    length: { kind: 'int', min: 1, max: MAX_RESOLUTION, step: 4, default: 81 },
    batch_size: BATCH_SIZE,
  },
} satisfies Record<string, Record<string, NumberSpec>>;
