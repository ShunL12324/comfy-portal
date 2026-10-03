import { CORE_NUMBER_SPECS } from '@/features/comfy-node/components/node/types/base/core-number-specs';
import { numberFieldFor } from '@/features/comfy-node/utils/number-control';
import { FieldSpec, pickFieldSpec } from '@/features/comfy-node/utils/schema-inputs';
import { NodeSchema, normalizeSchema, resolveInputSpec } from '@/services/node-schema';

/** What `SchemaField` renders for a numeric input: the server's spec, else the editor's fallback. */
function fieldFor(schema: NodeSchema | null, inputKey: string, inputs: Record<string, unknown>, fallback: FieldSpec) {
  const spec = pickFieldSpec(resolveInputSpec(schema, inputKey, inputs), fallback);
  if (spec.kind !== 'int' && spec.kind !== 'float') throw new Error(`${inputKey} is not numeric`);
  return numberFieldFor(spec, inputKey, inputs[inputKey]);
}

// A server that has tightened KSampler's ranges, so its values are distinguishable from the fallbacks.
const kSamplerSchema = normalizeSchema({
  input: {
    required: {
      model: ['MODEL', undefined],
      seed: ['INT', { default: 0, min: 0, max: 0xffffffffffffffff, control_after_generate: true }],
      steps: ['INT', { default: 20, min: 1, max: 500 }],
      cfg: ['FLOAT', { default: 8, min: 0, max: 50, step: 0.1, round: 0.01 }],
      denoise: ['FLOAT', { default: 1, min: 0, max: 1, step: 0.01 }],
    },
  },
});

describe('KSampler', () => {
  const inputs = { seed: 1, steps: 30, cfg: 6.5, denoise: 0.6 };
  const specs = CORE_NUMBER_SPECS.KSampler;

  it('reads steps and CFG from the server instead of the old 1–100 and 1–30 sliders', () => {
    expect(fieldFor(kSamplerSchema, 'steps', inputs, specs.steps)).toMatchObject({
      control: 'stepper',
      min: 1,
      max: 500,
      step: 1,
    });
    expect(fieldFor(kSamplerSchema, 'cfg', inputs, specs.cfg)).toMatchObject({
      control: 'stepper',
      min: 0,
      max: 50,
      step: 0.5,
      decimalPlaces: 1,
    });
    expect(fieldFor(kSamplerSchema, 'denoise', inputs, specs.denoise)).toMatchObject({
      control: 'slider',
      min: 0,
      max: 1,
    });
  });

  it("falls back to ComfyUI's declared ranges until the definition loads", () => {
    expect(fieldFor(null, 'steps', inputs, specs.steps)).toMatchObject({ control: 'stepper', max: 10000 });
    expect(fieldFor(null, 'cfg', inputs, specs.cfg)).toMatchObject({ control: 'stepper', min: 0, max: 100 });
  });

  it('shows a saved value outside the range without rewriting it', () => {
    const saved = { ...inputs, steps: 800, cfg: 70 };
    expect(fieldFor(kSamplerSchema, 'steps', saved, specs.steps).value).toBe(800);
    expect(fieldFor(kSamplerSchema, 'cfg', saved, specs.cfg).value).toBe(70);
    expect(saved.steps).toBe(800);
  });
});

describe('other migrated core editors', () => {
  it('EmptyLatentImage batch size is a stepper over the server range, not a 1–4 slider', () => {
    const schema = normalizeSchema({
      input: { required: { batch_size: ['INT', { default: 1, min: 1, max: 4096 }] } },
    });
    expect(
      fieldFor(schema, 'batch_size', { batch_size: 2 }, CORE_NUMBER_SPECS.EmptyLatentImage.batch_size),
    ).toMatchObject({ control: 'stepper', min: 1, max: 4096 });
  });

  it('ModelSamplingSD3 shift is a stepper tapping by 0.5', () => {
    expect(fieldFor(null, 'shift', { shift: 3 }, CORE_NUMBER_SPECS.ModelSamplingSD3.shift)).toMatchObject({
      control: 'stepper',
      step: 0.5,
      decimalPlaces: 2,
    });
  });

  it('VAEEncodeForInpaint grow_mask_by stays a slider over its short range', () => {
    expect(
      fieldFor(null, 'grow_mask_by', { grow_mask_by: 6 }, CORE_NUMBER_SPECS.VAEEncodeForInpaint.grow_mask_by),
    ).toMatchObject({ control: 'slider', min: 0, max: 64 });
  });
});
